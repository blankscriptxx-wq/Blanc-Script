import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, clientOnboardings, clients, invoiceLineItems, invoices, servicePlans } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { nextInvoiceNumber } from "@/lib/data/billing";
import { sendInvoicePaidEmail } from "@/lib/data/followups";
import { deactivatePaymentLink } from "@/lib/payments/stripe";

/**
 * Payments taken outside Stripe (cash or bank transfer). Staff mark them; the
 * OS still produces a proper paid invoice, shows it in the client's portal and
 * emails the receipt — it just never sends anyone to Stripe.
 */

export type DirectMethod = "cash" | "bank";
const method = z.enum(["cash", "bank"]);
const LABEL: Record<DirectMethod, string> = { cash: "cash", bank: "bank transfer" };

function requireMoney(user: { capabilities: Set<string> }) {
  if (!user.capabilities.has("can_see_money")) {
    throw new Error("You do not have permission to record payments.");
  }
}

/** Mark an existing client invoice as paid in cash / by bank transfer. */
export async function markInvoicePaidDirect(invoiceId: string, how: DirectMethod): Promise<void> {
  const user = await requireUser();
  requireMoney(user);
  const via = method.parse(how);
  const db = getDb();
  const [inv] = await db
    .update(invoices)
    .set({ status: "paid", paidAt: sql`now()`, paymentMethod: via, paymentUrl: null, updatedAt: sql`now()` })
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, user.orgId),
        isNull(invoices.talentId),
        sql`${invoices.status} <> 'paid'`,
      ),
    )
    .returning({ id: invoices.id, clientId: invoices.clientId, linkId: invoices.stripePaymentLinkId });
  if (!inv) throw new Error("That invoice is already paid, or isn't a client invoice.");
  // Nobody should be able to pay it again by card.
  if (inv.linkId) await deactivatePaymentLink(inv.linkId).catch(() => {});
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.paid_direct",
    entityType: "invoice",
    entityId: inv.id,
    meta: { via },
  });
  await sendInvoicePaidEmail(user.orgId, inv.id).catch(() => {});
}

export type CashDefaults = { lines: { name: string; pricePence: number }[]; totalPence: number };

/** What a month costs this client under their agreement (package + monthly add-ons). */
export async function cashPaymentDefaults(orgId: string, clientId: string): Promise<CashDefaults> {
  const db = getDb();
  const [c] = await db
    .select({
      retainerOverridePence: clients.retainerOverridePence,
      planName: servicePlans.name,
      planPricePence: servicePlans.pricePence,
    })
    .from(clients)
    .leftJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!c) throw new Error("That client was not found.");
  const [ob] = await db
    .select({ extras: clientOnboardings.extras })
    .from(clientOnboardings)
    .where(
      and(
        eq(clientOnboardings.orgId, orgId),
        eq(clientOnboardings.clientId, clientId),
        eq(clientOnboardings.billingType, "subscription"),
        inArray(clientOnboardings.status, ["sent", "completed"]),
      ),
    )
    .orderBy(desc(clientOnboardings.createdAt))
    .limit(1);
  const monthly = c.retainerOverridePence ?? c.planPricePence;
  const lines = [
    ...(c.planName && monthly ? [{ name: `${c.planName} — monthly package`, pricePence: monthly }] : []),
    ...(ob?.extras ?? []).filter((x) => x.cadence === "monthly" && x.pricePence > 0).map((x) => ({ name: x.name, pricePence: x.pricePence })),
  ];
  return { lines, totalPence: lines.reduce((n, l) => n + l.pricePence, 0) };
}

const recordInput = z.object({
  description: z.string().trim().max(200).optional(),
  amountPence: z.number().int().min(1, "Enter the amount received.").max(100_000_00),
  method,
});

/**
 * Record money received directly: creates a paid invoice (BS-####), which the
 * client sees in their portal and is emailed. If the amount matches the
 * client's monthly agreement the invoice itemises it; otherwise it is one line.
 */
export async function recordDirectPayment(clientId: string, raw: z.input<typeof recordInput>): Promise<{ number: string }> {
  const user = await requireUser();
  requireMoney(user);
  const data = recordInput.parse(raw);
  const defaults = await cashPaymentDefaults(user.orgId, clientId);
  const itemised = defaults.totalPence === data.amountPence && defaults.lines.length > 0 && !data.description;
  const lines = itemised
    ? defaults.lines
    : [{ name: data.description || `Payment received (${LABEL[data.method]})`, pricePence: data.amountPence }];
  const db = getDb();
  const number = await nextInvoiceNumber(user.orgId);
  const [inv] = await db
    .insert(invoices)
    .values({
      orgId: user.orgId,
      clientId,
      number,
      status: "paid",
      amountPence: data.amountPence,
      reference: `Paid by ${LABEL[data.method]}`,
      paymentMethod: data.method,
      issuedAt: new Date(),
      paidAt: new Date(),
    })
    .returning({ id: invoices.id });
  await db.insert(invoiceLineItems).values(
    lines.map((l, i) => ({ orgId: user.orgId, invoiceId: inv.id, description: l.name, quantity: 1, unitPence: l.pricePence, sortOrder: i })),
  );
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.paid_direct",
    entityType: "invoice",
    entityId: inv.id,
    meta: { via: data.method, number, amountPence: data.amountPence, recorded: true },
  });
  await sendInvoicePaidEmail(user.orgId, inv.id).catch(() => {});
  return { number };
}
