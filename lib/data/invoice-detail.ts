import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { invoices, invoiceLineItems, clients, talent, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import type { InvoiceStatus } from "@/lib/data/finance";

/**
 * Invoice detail + line-item data access. EVERY query is scoped to the caller's
 * org_id (tenancy enforced here, with Neon RLS as defence in depth). Money
 * mutations additionally require the can_see_money capability.
 */

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPence: number;
  sortOrder: number;
  lineTotalPence: number;
};

export type InvoiceDetailHeader = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  amountPence: number;
  currency: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  clientId: string | null;
  /** Client name, or "Blanc Script" when there is no client attached. */
  clientName: string;
  talentId: string | null;
  /** Payee name when this invoice is a talent payment (money out). */
  talentName: string | null;
};

export type InvoiceDetail = {
  invoice: InvoiceDetailHeader;
  lineItems: InvoiceLineItem[];
  /** Sum of quantity × unitPence across all line items. */
  lineTotalPence: number;
};

function requireMoney(user: Awaited<ReturnType<typeof requireUser>>) {
  if (!user.capabilities.has("can_see_money")) {
    throw new Error("You do not have permission to change finance records.");
  }
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail | null> {
  const user = await requireUser();
  const db = getDb();

  const [inv] = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      amountPence: invoices.amountPence,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      clientId: invoices.clientId,
      clientName: clients.name,
      talentId: invoices.talentId,
      talentName: talent.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(talent, eq(invoices.talentId, talent.id))
    .where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)))
    .limit(1);
  if (!inv) return null;

  const rows = await db
    .select({
      id: invoiceLineItems.id,
      description: invoiceLineItems.description,
      quantity: invoiceLineItems.quantity,
      unitPence: invoiceLineItems.unitPence,
      sortOrder: invoiceLineItems.sortOrder,
    })
    .from(invoiceLineItems)
    .where(
      and(
        eq(invoiceLineItems.orgId, user.orgId),
        eq(invoiceLineItems.invoiceId, id),
      ),
    )
    .orderBy(asc(invoiceLineItems.sortOrder), asc(invoiceLineItems.createdAt));

  const lineItems: InvoiceLineItem[] = rows.map((r) => ({
    id: r.id,
    description: r.description,
    quantity: r.quantity,
    unitPence: r.unitPence,
    sortOrder: r.sortOrder,
    lineTotalPence: r.quantity * r.unitPence,
  }));
  const lineTotalPence = lineItems.reduce((s, l) => s + l.lineTotalPence, 0);

  return {
    invoice: {
      id: inv.id,
      number: inv.number,
      status: inv.status as InvoiceStatus,
      amountPence: inv.amountPence,
      currency: inv.currency,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      clientId: inv.clientId,
      clientName: inv.clientName ?? "Blanc Script",
      talentId: inv.talentId,
      talentName: inv.talentName,
    },
    lineItems,
    lineTotalPence,
  };
}

/** Ensure the invoice exists in the caller's workspace; returns its id or throws. */
async function requireInvoiceInOrg(invoiceId: string, orgId: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("That invoice was not found in your workspace.");
  return row.id;
}

export const addLineItemInput = z.object({
  invoiceId: z.string().uuid(),
  description: z.string().trim().min(1, "Enter a description.").max(500),
  quantity: z.number().int().positive(),
  unitPence: z.number().int().nonnegative(),
});
export type AddLineItemInput = z.infer<typeof addLineItemInput>;

export async function addLineItem(input: AddLineItemInput) {
  const user = await requireUser();
  requireMoney(user);
  const data = addLineItemInput.parse(input);
  await requireInvoiceInOrg(data.invoiceId, user.orgId);

  const [agg] = await getDb()
    .select({ maxSort: sql<number>`coalesce(max(${invoiceLineItems.sortOrder}), -1)` })
    .from(invoiceLineItems)
    .where(
      and(
        eq(invoiceLineItems.orgId, user.orgId),
        eq(invoiceLineItems.invoiceId, data.invoiceId),
      ),
    );
  const nextSort = Number(agg?.maxSort ?? -1) + 1;

  const [row] = await getDb()
    .insert(invoiceLineItems)
    .values({
      orgId: user.orgId,
      invoiceId: data.invoiceId,
      description: data.description,
      quantity: data.quantity,
      unitPence: data.unitPence,
      sortOrder: nextSort,
    })
    .returning({ id: invoiceLineItems.id });

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.line_item.added",
    entityType: "invoice",
    entityId: data.invoiceId,
    meta: {
      lineItemId: row.id,
      description: data.description,
      quantity: data.quantity,
      unitPence: data.unitPence,
    },
  });
  return row;
}

export async function removeLineItem(id: string) {
  const user = await requireUser();
  requireMoney(user);

  const [deleted] = await getDb()
    .delete(invoiceLineItems)
    .where(and(eq(invoiceLineItems.id, id), eq(invoiceLineItems.orgId, user.orgId)))
    .returning({ id: invoiceLineItems.id, invoiceId: invoiceLineItems.invoiceId });
  if (!deleted) return;

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.line_item.removed",
    entityType: "invoice",
    entityId: deleted.invoiceId,
    meta: { lineItemId: deleted.id },
  });
}

export async function setInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const user = await requireUser();
  requireMoney(user);
  const parsed = z
    .enum(["draft", "sent", "approved", "paid", "overdue"])
    .parse(status);
  await requireInvoiceInOrg(invoiceId, user.orgId);

  // Mark the paid timestamp when moving to 'paid'; clear it otherwise so the
  // record stays consistent if an invoice is reopened.
  await getDb()
    .update(invoices)
    .set({
      status: parsed,
      paidAt: parsed === "paid" ? sql`now()` : null,
      updatedAt: sql`now()`,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.status_changed",
    entityType: "invoice",
    entityId: invoiceId,
    meta: { status: parsed },
  });
}

/** Set invoices.amountPence to the sum of its line items (quantity × unitPence). */
export async function syncInvoiceAmountToLines(invoiceId: string) {
  const user = await requireUser();
  requireMoney(user);
  await requireInvoiceInOrg(invoiceId, user.orgId);

  const [agg] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${invoiceLineItems.quantity} * ${invoiceLineItems.unitPence}), 0)`,
    })
    .from(invoiceLineItems)
    .where(
      and(
        eq(invoiceLineItems.orgId, user.orgId),
        eq(invoiceLineItems.invoiceId, invoiceId),
      ),
    );
  const total = Number(agg?.total ?? 0);

  await getDb()
    .update(invoices)
    .set({ amountPence: total, updatedAt: sql`now()` })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)));
  return total;
}
