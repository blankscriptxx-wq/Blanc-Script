import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityLog, invoices } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { invoiceGrossPence } from "@/lib/data/finance";
import {
  createPaymentLink,
  deactivatePaymentLink,
  paymentLinkPaid,
} from "@/lib/payments/stripe";

/**
 * Online payment for client invoices (Stripe Payment Links).
 * Staff actions are org-scoped and need can_see_money. The "mark paid" path
 * is also used by the Stripe webhook and the client portal, which have no
 * signed-in user — it only ever moves an invoice to paid.
 */

function requireMoney(user: { capabilities: Set<string> }) {
  if (!user.capabilities.has("can_see_money")) {
    throw new Error("You do not have permission to change finance records.");
  }
}

function appOrigin(): string {
  return (process.env.APP_ORIGIN?.trim() || "https://studio.blancscript.com").replace(/\/$/, "");
}

/** Create (or replace) the Stripe payment link for an invoice. */
export async function createInvoicePaymentLink(invoiceId: string): Promise<{ url: string }> {
  const user = await requireUser();
  requireMoney(user);

  const [inv] = await getDb()
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      talentId: invoices.talentId,
      currency: invoices.currency,
      gross: invoiceGrossPence,
      linkId: invoices.stripePaymentLinkId,
    })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)))
    .limit(1);
  if (!inv) throw new Error("That invoice was not found in your workspace.");
  if (inv.talentId) throw new Error("Talent payments are money out, so they can't take online payment.");
  if (inv.status === "paid") throw new Error("This invoice is already paid.");
  const gross = Number(inv.gross);
  if (!Number.isInteger(gross) || gross < 50) {
    throw new Error("Add line items first — the total must be at least £0.50 to take payment.");
  }

  if (inv.linkId) await deactivatePaymentLink(inv.linkId).catch(() => {});

  const link = await createPaymentLink({
    invoiceId: inv.id,
    title: `Blanc Script invoice ${inv.number ?? inv.id.slice(0, 8)}`,
    amountPence: gross,
    currency: inv.currency,
    returnUrl: `${appOrigin()}/pay/thanks`,
  });

  await getDb()
    .update(invoices)
    .set({
      paymentUrl: link.url,
      stripePaymentLinkId: link.id,
      stripeLinkAmountPence: gross,
      updatedAt: sql`now()`,
    })
    .where(and(eq(invoices.id, inv.id), eq(invoices.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.payment_link.created",
    entityType: "invoice",
    entityId: inv.id,
    meta: { amountPence: gross },
  });
  return { url: link.url };
}

/**
 * Mark an invoice paid because Stripe says so. No user session: callers are
 * the Stripe webhook and the "check payment" paths. Idempotent.
 */
export async function markInvoicePaidFromStripe(
  invoiceId: string,
  source: "webhook" | "check",
): Promise<boolean> {
  const [row] = await getDb()
    .update(invoices)
    .set({ status: "paid", paidAt: sql`now()`, paymentMethod: "card", updatedAt: sql`now()` })
    .where(and(eq(invoices.id, invoiceId), sql`${invoices.status} <> 'paid'`))
    .returning({ id: invoices.id, orgId: invoices.orgId });
  if (!row) return false;
  await getDb().insert(activityLog).values({
    orgId: row.orgId,
    actorUserId: null,
    action: "invoice.paid_online",
    entityType: "invoice",
    entityId: row.id,
    meta: { via: "stripe", source },
  });
  const { sendInvoicePaidEmail } = await import("@/lib/data/followups");
  await sendInvoicePaidEmail(row.orgId, row.id).catch(() => {});
  return true;
}

/**
 * Ask Stripe whether an invoice's link has been paid and, if so, mark it paid.
 * `orgId` scopes the lookup (staff session or a resolved portal link).
 */
export async function syncInvoicePayment(invoiceId: string, orgId: string): Promise<"paid" | "unpaid" | "no_link"> {
  const [inv] = await getDb()
    .select({ status: invoices.status, linkId: invoices.stripePaymentLinkId })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!inv) throw new Error("That invoice was not found.");
  if (inv.status === "paid") return "paid";
  if (!inv.linkId) return "no_link";
  if (!(await paymentLinkPaid(inv.linkId))) return "unpaid";
  await markInvoicePaidFromStripe(invoiceId, "check");
  return "paid";
}

/** Staff-facing wrapper around syncInvoicePayment. */
export async function checkInvoicePayment(invoiceId: string) {
  const user = await requireUser();
  requireMoney(user);
  return syncInvoicePayment(invoiceId, user.orgId);
}
