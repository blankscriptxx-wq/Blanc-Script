import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { invoices, clients, activityLog, talent } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Finance data access — internal invoices. EVERY query is scoped to the caller's
 * org_id (tenancy enforced here, with Neon RLS as defence in depth). Xero sync is a
 * later integration and is intentionally not wired up.
 */

export type InvoiceStatus = "draft" | "sent" | "approved" | "paid" | "overdue";

export type InvoiceRow = {
  id: string;
  number: string | null;
  clientName: string | null;
  talentId: string | null;
  talentName: string | null;
  amountPence: number;
  status: InvoiceStatus;
  currency: string;
  dueAt: Date | null;
  createdAt: Date;
};

export async function listInvoices(): Promise<InvoiceRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      talentId: invoices.talentId,
      talentName: talent.name,
      amountPence: invoices.amountPence,
      status: invoices.status,
      currency: invoices.currency,
      dueAt: invoices.dueAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(talent, eq(invoices.talentId, talent.id))
    .where(and(eq(invoices.orgId, user.orgId), isNull(invoices.archivedAt)))
    .orderBy(desc(invoices.createdAt));
  return rows as InvoiceRow[];
}

export type FinanceSummary = {
  outstandingPence: number;
  paidThisMonthPence: number;
  overdueCount: number;
};

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const user = await requireUser();
  const [agg] = await getDb()
    .select({
      outstandingPence: sql<number>`coalesce(sum(${invoices.amountPence}) filter (where ${invoices.status} in ('sent','approved','overdue')), 0)`,
      paidThisMonthPence: sql<number>`coalesce(sum(${invoices.amountPence}) filter (where ${invoices.status} = 'paid' and ${invoices.paidAt} >= date_trunc('month', now())), 0)`,
      overdueCount: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')`,
    })
    .from(invoices)
    .where(and(eq(invoices.orgId, user.orgId), isNull(invoices.archivedAt)));

  return {
    outstandingPence: Number(agg?.outstandingPence ?? 0),
    paidThisMonthPence: Number(agg?.paidThisMonthPence ?? 0),
    overdueCount: Number(agg?.overdueCount ?? 0),
  };
}

export async function getInvoice(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      amountPence: invoices.amountPence,
      status: invoices.status,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)))
    .limit(1);
  return row ?? null;
}

export async function listClientOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
    .orderBy(asc(clients.name));
}

export async function listTalentOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: talent.id, name: talent.name })
    .from(talent)
    .where(and(eq(talent.orgId, user.orgId), isNull(talent.archivedAt)))
    .orderBy(asc(talent.name));
}

export const invoiceInput = z.object({
  clientId: z.string().uuid().nullable().optional(),
  talentId: z.string().uuid().nullable().optional(),
  number: z.string().trim().max(80).nullable().optional(),
  amountPence: z.number().int().nonnegative(),
  status: z.enum(["draft", "sent", "approved", "paid", "overdue"]).default("draft"),
  dueAt: z.coerce.date().nullable().optional(),
});
export type InvoiceInput = z.infer<typeof invoiceInput>;

export async function createInvoice(input: InvoiceInput) {
  const user = await requireUser();
  const data = invoiceInput.parse(input);
  // Guard: a talent payment must reference a talent in this workspace.
  if (data.talentId) {
    const [t] = await getDb()
      .select({ id: talent.id })
      .from(talent)
      .where(and(eq(talent.id, data.talentId), eq(talent.orgId, user.orgId)))
      .limit(1);
    if (!t) throw new Error("That talent was not found in your workspace.");
  }
  const [row] = await getDb()
    .insert(invoices)
    .values({
      orgId: user.orgId,
      clientId: data.clientId ?? null,
      talentId: data.talentId ?? null,
      number: data.number ? data.number : null,
      amountPence: data.amountPence,
      status: data.status,
      dueAt: data.dueAt ?? null,
    })
    .returning({ id: invoices.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "invoice.created",
    entityType: "invoice",
    entityId: row.id,
    meta: {
      number: data.number ?? null,
      amountPence: data.amountPence,
      status: data.status,
      talentId: data.talentId ?? null,
    },
  });
  return row;
}
