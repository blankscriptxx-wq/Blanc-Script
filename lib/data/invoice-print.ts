import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  clients,
  invoiceLineItems,
  invoices,
  organisations,
  talent,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type PrintLineItem = {
  description: string;
  quantity: number;
  unitPence: number;
  lineTotalPence: number;
};

export type InvoiceForPrint = {
  org: {
    name: string;
    logoUrl: string | null;
    vatNumber: string | null;
    addressText: string | null;
    billingEmail: string | null;
  };
  invoice: {
    number: string | null;
    status: string;
    currency: string;
    reference: string | null;
    terms: string | null;
    paymentUrl: string | null;
    issuedAt: Date | null;
    dueAt: Date | null;
    billTo: string;
  };
  lineItems: PrintLineItem[];
  subtotalPence: number;
  taxRatePct: number | null;
  taxPence: number;
  grandTotalPence: number;
};

export async function getInvoiceForPrint(id: string): Promise<InvoiceForPrint | null> {
  const user = await requireUser();
  const db = getDb();

  const [inv] = await db
    .select({
      number: invoices.number,
      status: invoices.status,
      currency: invoices.currency,
      reference: invoices.reference,
      terms: invoices.terms,
      paymentUrl: invoices.paymentUrl,
      taxRatePct: invoices.taxRatePct,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      amountPence: invoices.amountPence,
      clientName: clients.name,
      talentName: talent.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(talent, eq(invoices.talentId, talent.id))
    .where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)))
    .limit(1);
  if (!inv) return null;

  const [org] = await db
    .select({
      name: organisations.name,
      logoUrl: organisations.logoUrl,
      vatNumber: organisations.vatNumber,
      addressText: organisations.addressText,
      billingEmail: organisations.billingEmail,
    })
    .from(organisations)
    .where(eq(organisations.id, user.orgId))
    .limit(1);

  const lines = await db
    .select({
      description: invoiceLineItems.description,
      quantity: invoiceLineItems.quantity,
      unitPence: invoiceLineItems.unitPence,
    })
    .from(invoiceLineItems)
    .where(
      and(eq(invoiceLineItems.invoiceId, id), eq(invoiceLineItems.orgId, user.orgId)),
    )
    .orderBy(asc(invoiceLineItems.sortOrder), asc(invoiceLineItems.createdAt));

  const lineItems: PrintLineItem[] = lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPence: l.unitPence,
    lineTotalPence: l.quantity * l.unitPence,
  }));

  // Fall back to the invoice's stored amount if there are no line items yet.
  const subtotalPence =
    lineItems.length > 0
      ? lineItems.reduce((s, l) => s + l.lineTotalPence, 0)
      : inv.amountPence;
  const taxPence = inv.taxRatePct ? Math.round((subtotalPence * inv.taxRatePct) / 100) : 0;

  return {
    org: {
      name: org?.name ?? "Blanc Script",
      logoUrl: org?.logoUrl ?? null,
      vatNumber: org?.vatNumber ?? null,
      addressText: org?.addressText ?? null,
      billingEmail: org?.billingEmail ?? null,
    },
    invoice: {
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      reference: inv.reference,
      terms: inv.terms,
      paymentUrl: inv.paymentUrl,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      billTo: inv.talentName ?? inv.clientName ?? "Blanc Script",
    },
    lineItems,
    subtotalPence,
    taxRatePct: inv.taxRatePct,
    taxPence,
    grandTotalPence: subtotalPence + taxPence,
  };
}
