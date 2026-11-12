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
  /** VAT / tax rate as a whole-number percent (e.g. 20), or null when untaxed. */
  taxRatePct: number | null;
  /** Online payment link (Stripe etc.), when set. */
  paymentUrl: string | null;
  stripePaymentLinkId: string | null;
  stripeLinkAmountPence: number | null;
  /** PO number / client reference. */
  reference: string | null;
  /** Free-text payment terms. */
  terms: string | null;
};

export type InvoiceDetail = {
  invoice: InvoiceDetailHeader;
  lineItems: InvoiceLineItem[];
  /** Sum of quantity × unitPence across all line items. */
  lineTotalPence: number;
  /** Tax on the line-item total at the invoice's tax rate (rounded to the nearest penny). */
  taxPence: number;
  /** lineTotalPence + taxPence. */
  grandTotalPence: number;
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
      taxRatePct: invoices.taxRatePct,
      paymentUrl: invoices.paymentUrl,
      stripePaymentLinkId: invoices.stripePaymentLinkId,
      stripeLinkAmountPence: invoices.stripeLinkAmountPence,
      reference: invoices.reference,
      terms: invoices.terms,
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
  const taxRatePct = inv.taxRatePct ?? 0;
  const taxPence = Math.round((lineTotalPence * taxRatePct) / 100);
  const grandTotalPence = lineTotalPence + taxPence;

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
      taxRatePct: inv.taxRatePct,
      paymentUrl: inv.paymentUrl,
      stripePaymentLinkId: inv.stripePaymentLinkId,
      stripeLinkAmountPence: inv.stripeLinkAmountPence,
      reference: inv.reference,
      terms: inv.terms,
    },
    lineItems,
    lineTotalPence,
    taxPence,
    grandTotalPence,
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

/**
 * Paid invoices are a financial record: their line items are locked until the
 * invoice is reopened (status moved off "paid").
 */
async function requireInvoiceUnlocked(invoiceId: string, orgId: string): Promise<void> {
  const [row] = await getDb()
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("That invoice was not found in your workspace.");
  if (row.status === "paid") {
    throw new Error("This invoice is paid, so its line items are locked. Change its status to edit it.");
  }
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
  await requireInvoiceUnlocked(data.invoiceId, user.orgId);

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

  const [existing] = await getDb()
    .select({ invoiceId: invoiceLineItems.invoiceId })
    .from(invoiceLineItems)
    .where(and(eq(invoiceLineItems.id, id), eq(invoiceLineItems.orgId, user.orgId)))
    .limit(1);
  if (!existing) return;
  await requireInvoiceUnlocked(existing.invoiceId, user.orgId);

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

export const updateInvoiceInput = z.object({
  number: z.string().trim().max(80).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  talentId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "sent", "approved", "paid", "overdue"]).optional(),
  issuedAt: z.coerce.date().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  taxRatePct: z.number().int().min(0).max(100).nullable().optional(),
  paymentUrl: z.string().trim().url("Enter a valid URL.").max(2000).nullable().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  terms: z.string().trim().max(2000).nullable().optional(),
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInput>;

/**
 * Patch an invoice's header fields. Only keys present in `input` are written, so
 * callers can update a subset. Org-scoped, requires can_see_money, and verifies
 * the invoice (and any referenced client/talent) belong to the caller's workspace.
 */
export async function updateInvoice(id: string, input: UpdateInvoiceInput) {
  const user = await requireUser();
  requireMoney(user);
  const data = updateInvoiceInput.parse(input);
  await requireInvoiceInOrg(id, user.orgId);

  // A client / talent reference must live in this workspace.
  if (data.clientId) {
    const [c] = await getDb()
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, data.clientId), eq(clients.orgId, user.orgId)))
      .limit(1);
    if (!c) throw new Error("That client was not found in your workspace.");
  }
  if (data.talentId) {
    const [t] = await getDb()
      .select({ id: talent.id })
      .from(talent)
      .where(and(eq(talent.id, data.talentId), eq(talent.orgId, user.orgId)))
      .limit(1);
    if (!t) throw new Error("That talent was not found in your workspace.");
  }

  const set: Record<string, unknown> = { updatedAt: sql`now()` };
  if (data.number !== undefined) set.number = data.number ? data.number : null;
  if (data.clientId !== undefined) set.clientId = data.clientId ?? null;
  if (data.talentId !== undefined) set.talentId = data.talentId ?? null;
  if (data.issuedAt !== undefined) set.issuedAt = data.issuedAt ?? null;
  if (data.dueAt !== undefined) set.dueAt = data.dueAt ?? null;
  if (data.taxRatePct !== undefined) set.taxRatePct = data.taxRatePct ?? null;
  if (data.paymentUrl !== undefined) set.paymentUrl = data.paymentUrl ? data.paymentUrl : null;
  if (data.reference !== undefined) set.reference = data.reference ? data.reference : null;
  if (data.terms !== undefined) set.terms = data.terms ? data.terms : null;
  if (data.status !== undefined) {
    set.status = data.status;
    // Keep paidAt consistent with the status, mirroring setInvoiceStatus.
    set.paidAt = data.status === "paid" ? sql`now()` : null;
  }

  await getDb()
    .update(invoices)
    .set(set)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.updated",
    entityType: "invoice",
    entityId: id,
    meta: {
      fields: Object.keys(set).filter((k) => k !== "updatedAt"),
      status: data.status ?? null,
    },
  });
}

/**
 * Void an invoice by archiving it. listInvoices already excludes archived rows,
 * so this removes it from the working set. (The invoice_status enum has no
 * "void" member, so the status column is left untouched.)
 */
export async function archiveInvoice(id: string) {
  const user = await requireUser();
  requireMoney(user);
  await requireInvoiceInOrg(id, user.orgId);

  await getDb()
    .update(invoices)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.voided",
    entityType: "invoice",
    entityId: id,
    meta: {},
  });
}
