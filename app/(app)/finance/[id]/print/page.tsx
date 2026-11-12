import { notFound } from "next/navigation";
import { PrintButton } from "@/components/finance/print-button";
import { getInvoiceForPrint } from "@/lib/data/invoice-print";

export const dynamic = "force-dynamic";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" });
const money = (p: number) => gbp.format(p / 100);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getInvoiceForPrint(id).catch(() => null);
  return { title: data?.invoice.number ? `Invoice ${data.invoice.number}` : "Invoice" };
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getInvoiceForPrint(id).catch(() => null);
  if (!data) notFound();
  const { org, invoice, lineItems, subtotalPence, taxRatePct, taxPence, grandTotalPence } = data;

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <a href={`/finance/${id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
            ← Back
          </a>
          <PrintButton />
        </div>

        <article className="rounded-lg bg-white p-10 text-neutral-900 shadow-sm print:rounded-none print:p-8 print:shadow-none">
          {/* Header */}
          <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-6">
            <div>
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt={org.name} className="mb-2 h-10 w-auto object-contain" />
              ) : (
                <div className="text-xl font-semibold">{org.name}</div>
              )}
              {org.addressText ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-500">{org.addressText}</p>
              ) : null}
              {org.vatNumber ? (
                <p className="mt-1 text-xs text-neutral-500">VAT: {org.vatNumber}</p>
              ) : null}
              {org.billingEmail ? (
                <p className="text-xs text-neutral-500">{org.billingEmail}</p>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tracking-tight">INVOICE</div>
              {invoice.number ? (
                <div className="mt-1 text-sm text-neutral-500">{invoice.number}</div>
              ) : null}
              <div className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium uppercase text-neutral-600">
                {invoice.status}
              </div>
            </div>
          </header>

          {/* Parties + dates */}
          <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">Bill to</div>
              <div className="mt-1 font-medium">{invoice.billTo}</div>
              {invoice.reference ? (
                <div className="mt-1 text-xs text-neutral-500">Ref: {invoice.reference}</div>
              ) : null}
            </div>
            <div className="text-right">
              {invoice.issuedAt ? (
                <div>
                  <span className="text-neutral-400">Issued: </span>
                  {dateFmt.format(new Date(invoice.issuedAt))}
                </div>
              ) : null}
              {invoice.dueAt ? (
                <div>
                  <span className="text-neutral-400">Due: </span>
                  {dateFmt.format(new Date(invoice.dueAt))}
                </div>
              ) : null}
            </div>
          </section>

          {/* Line items */}
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr className="border-b border-neutral-100">
                  <td className="py-2 text-neutral-500" colSpan={3}>
                    (No itemised lines — total below)
                  </td>
                  <td className="py-2 text-right tabular-nums">{money(subtotalPence)}</td>
                </tr>
              ) : (
                lineItems.map((l, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2">{l.description}</td>
                    <td className="py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{money(l.unitPence)}</td>
                    <td className="py-2 text-right tabular-nums">{money(l.lineTotalPence)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} />
                <td className="py-2 text-right text-neutral-500">Subtotal</td>
                <td className="py-2 text-right tabular-nums">{money(subtotalPence)}</td>
              </tr>
              {taxRatePct ? (
                <tr>
                  <td colSpan={2} />
                  <td className="py-1 text-right text-neutral-500">VAT ({taxRatePct}%)</td>
                  <td className="py-1 text-right tabular-nums">{money(taxPence)}</td>
                </tr>
              ) : null}
              <tr className="border-t-2 border-neutral-800">
                <td colSpan={2} />
                <td className="py-2 text-right font-semibold">Total</td>
                <td className="py-2 text-right text-lg font-semibold tabular-nums">
                  {money(grandTotalPence)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Payment + terms */}
          {invoice.paymentUrl ? (
            <div className="mt-8 rounded-md bg-neutral-50 p-4 text-sm">
              <span className="text-neutral-500">Pay online: </span>
              <a href={invoice.paymentUrl} className="font-medium text-neutral-900 underline">
                {invoice.paymentUrl}
              </a>
            </div>
          ) : null}
          {invoice.terms ? (
            <p className="mt-6 whitespace-pre-wrap border-t border-neutral-200 pt-4 text-xs text-neutral-500">
              {invoice.terms}
            </p>
          ) : null}
        </article>
      </div>
    </div>
  );
}
