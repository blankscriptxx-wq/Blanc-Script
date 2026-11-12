import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { PayButton } from "@/components/portal/pay-button";
import { getPortalInvoice, resolvePortal } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" });
const money = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export default async function PortalInvoicePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const ctx = await resolvePortal(token);
  if (!ctx) redirect(`/portal/enter?t=${encodeURIComponent(token)}`);
  const inv = await getPortalInvoice(ctx, id);
  if (!inv) notFound();

  const tax = inv.totalPence - inv.subtotalPence;
  const paid = inv.status === "paid";

  return (
    <div>
      <Link
        href={`/portal/${token}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Back to your portal
      </Link>

      <div className="rounded-md border border-bs-border bg-bs-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-eyebrow uppercase text-bs-subtle">Invoice</p>
            <h1 className="mt-1 font-display text-h1 tabular-nums">{inv.number ?? "Invoice"}</h1>
            <p className="mt-1 text-sm text-bs-muted">
              {ctx.agencyName} → {ctx.clientName}
            </p>
          </div>
          <StatusPill tone={paid ? "success" : inv.status === "overdue" ? "danger" : "info"}>
            {paid ? "Paid" : inv.status === "overdue" ? "Overdue" : "Due"}
          </StatusPill>
        </div>

        <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {inv.issuedAt ? (
            <div className="flex justify-between gap-4 sm:justify-start">
              <dt className="text-bs-subtle">Issued</dt>
              <dd>{day.format(inv.issuedAt)}</dd>
            </div>
          ) : null}
          {paid && inv.paidAt ? (
            <div className="flex justify-between gap-4 sm:justify-start">
              <dt className="text-bs-subtle">Paid</dt>
              <dd>{day.format(inv.paidAt)}</dd>
            </div>
          ) : inv.dueAt ? (
            <div className="flex justify-between gap-4 sm:justify-start">
              <dt className="text-bs-subtle">Due</dt>
              <dd>{day.format(inv.dueAt)}</dd>
            </div>
          ) : null}
          {inv.reference ? (
            <div className="flex justify-between gap-4 sm:justify-start">
              <dt className="text-bs-subtle">Reference</dt>
              <dd>{inv.reference}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-bs-border text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 pr-3 text-right font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.length === 0 ? (
                <tr className="border-b border-bs-border">
                  <td className="py-2.5 pr-3">Services</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">1</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{money(inv.subtotalPence)}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(inv.subtotalPence)}</td>
                </tr>
              ) : (
                inv.lines.map((l, i) => (
                  <tr key={i} className="border-b border-bs-border">
                    <td className="py-2.5 pr-3">{l.description}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{l.quantity}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(l.unitPence)}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(l.quantity * l.unitPence)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {tax > 0 ? (
                <>
                  <tr>
                    <td colSpan={3} className="pt-3 pr-3 text-right text-bs-muted">Subtotal</td>
                    <td className="pt-3 text-right tabular-nums">{money(inv.subtotalPence)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-1 pr-3 text-right text-bs-muted">VAT ({inv.taxRatePct}%)</td>
                    <td className="py-1 text-right tabular-nums">{money(tax)}</td>
                  </tr>
                </>
              ) : null}
              <tr>
                <td colSpan={3} className="pt-3 pr-3 text-right font-medium">Total</td>
                <td className="pt-3 text-right font-display text-h3 tabular-nums">{money(inv.totalPence)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {inv.terms ? <p className="mt-5 whitespace-pre-wrap text-sm text-bs-muted">{inv.terms}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!paid && inv.paymentUrl ? (
            <PayButton token={token} invoiceId={inv.id} paymentUrl={inv.paymentUrl} />
          ) : null}
          {inv.documentUrl ? (
            <a
              href={inv.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong px-3 text-sm text-bs-text transition-colors hover:bg-bs-surface-2"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
