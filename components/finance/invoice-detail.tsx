"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { cn } from "@/lib/cn";
import {
  addLineItemAction,
  removeLineItemAction,
  setInvoiceStatusAction,
  type LineItemActionState,
} from "@/app/(app)/finance/[id]/actions";
import type { InvoiceDetail } from "@/lib/data/invoice-detail";
import type { InvoiceStatus } from "@/lib/data/finance";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});

const STATUS_META: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  approved: { label: "Approved", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
};

const STATUS_ORDER: InvoiceStatus[] = ["draft", "sent", "approved", "paid", "overdue"];

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";

function money(p: number): string {
  return gbp.format(p / 100);
}
function fmtDate(d: Date | null): string {
  return d ? dateFmt.format(new Date(d)) : "—";
}

export function InvoiceDetailView({ detail }: { detail: InvoiceDetail }) {
  const { invoice, lineItems, lineTotalPence } = detail;
  const payee = invoice.talentName ?? invoice.clientName;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/finance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Finance
      </Link>

      {/* Header */}
      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-bs-text">
            {invoice.number ?? "Untitled invoice"}
          </h1>
          <StatusPill tone={STATUS_META[invoice.status].tone}>
            {STATUS_META[invoice.status].label}
          </StatusPill>
          {invoice.talentName ? <StatusPill tone="gold">Talent pay</StatusPill> : null}
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label={invoice.talentName ? "Pay to talent" : "Client"} value={payee} />
          <Detail label="Amount" value={money(invoice.amountPence)} />
          <Detail label="Issued" value={fmtDate(invoice.issuedAt)} />
          <Detail label="Due" value={fmtDate(invoice.dueAt)} />
          <Detail label="Paid" value={fmtDate(invoice.paidAt)} />
          <Detail label="Raised" value={fmtDate(invoice.createdAt)} />
        </div>
      </div>

      {/* Status control */}
      <section className="mt-4 rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="mb-3 font-display text-h3 text-bs-text">Status</h2>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map((s) => {
            const active = s === invoice.status;
            const paid = s === "paid";
            return (
              <form key={s} action={setInvoiceStatusAction}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input type="hidden" name="status" value={s} />
                <button
                  type="submit"
                  disabled={active}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "cursor-default border-bs-border-strong bg-bs-surface-2 text-bs-text"
                      : paid
                        ? "border-bs-success bg-bs-success text-bs-on-accent hover:opacity-90"
                        : "border-bs-border-strong text-bs-text hover:bg-bs-surface-2",
                  )}
                >
                  {paid ? "Mark paid" : STATUS_META[s].label}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {/* Line items */}
      <section className="mt-4">
        <h2 className="mb-2 font-display text-h3 text-bs-text">Line items</h2>
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Unit</th>
                <th className="px-4 py-2.5 text-right font-medium">Line total</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-bs-subtle">
                    No line items yet. Add one below to build this invoice.
                  </td>
                </tr>
              ) : (
                lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-bs-border last:border-0">
                    <td className="px-4 py-3 text-bs-text">{li.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-bs-muted">
                      {li.quantity}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-bs-muted">
                      {money(li.unitPence)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-bs-text">
                      {money(li.lineTotalPence)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={removeLineItemAction}>
                        <input type="hidden" name="id" value={li.id} />
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button
                          type="submit"
                          aria-label={`Remove ${li.description}`}
                          className="rounded-sm p-1 text-bs-subtle transition-colors hover:bg-bs-surface-2 hover:text-bs-danger"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-bs-border bg-bs-surface-2">
                <td className="px-4 py-3 text-sm font-medium text-bs-text" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-display text-h3 tabular-nums text-bs-text">
                  {money(lineTotalPence)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <AddLineItemForm invoiceId={invoice.id} />
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-bs-border/60 py-1 last:border-0 sm:border-0">
      <span className="text-bs-subtle">{label}</span>
      <span className="text-bs-text">{value}</span>
    </div>
  );
}

function AddLineItemForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState<LineItemActionState, FormData>(
    addLineItemAction,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-3 space-y-2 rounded-md border border-dashed border-bs-border bg-bs-surface p-3"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem]">
        <input
          name="description"
          required
          placeholder="Description"
          className={inputCls}
          aria-label="Description"
        />
        <input
          name="quantity"
          type="number"
          step="1"
          min="1"
          defaultValue={1}
          placeholder="Qty"
          className={inputCls}
          aria-label="Quantity"
        />
        <input
          name="unit"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Unit £"
          className={inputCls}
          aria-label="Unit price in pounds"
        />
      </div>
      {state?.error ? <p className="text-xs text-bs-danger">{state.error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-sm bg-bs-text px-3 py-1.5 text-xs font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" /> {pending ? "Adding…" : "Add line item"}
        </button>
      </div>
    </form>
  );
}
