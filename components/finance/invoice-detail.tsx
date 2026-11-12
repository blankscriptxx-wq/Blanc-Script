"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { Button } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { cn } from "@/lib/cn";
import {
  addLineItemAction,
  removeLineItemAction,
  setInvoiceStatusAction,
  updateInvoiceAction,
  voidInvoiceAction,
  type LineItemActionState,
  type UpdateInvoiceActionState,
} from "@/app/(app)/finance/[id]/actions";
import type { InvoiceDetail } from "@/lib/data/invoice-detail";
import type { InvoiceStatus } from "@/lib/data/finance";

type Option = { id: string; name: string };

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
/** Format a date as YYYY-MM-DD for a <input type="date"> default value. */
function toDateInput(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function InvoiceDetailView({
  detail,
  clientOptions = [],
  talentOptions = [],
}: {
  detail: InvoiceDetail;
  clientOptions?: Option[];
  talentOptions?: Option[];
}) {
  const router = useRouter();
  const { invoice, lineItems, lineTotalPence, taxPence, grandTotalPence } = detail;
  const payee = invoice.talentName ?? invoice.clientName;
  const [editOpen, setEditOpen] = React.useState(false);

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
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit invoice
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label={invoice.talentName ? "Pay to talent" : "Client"} value={payee} />
          <Detail label="Amount" value={money(invoice.amountPence)} />
          <Detail label="Issued" value={fmtDate(invoice.issuedAt)} />
          <Detail label="Due" value={fmtDate(invoice.dueAt)} />
          <Detail label="Paid" value={fmtDate(invoice.paidAt)} />
          <Detail label="Raised" value={fmtDate(invoice.createdAt)} />
          <Detail
            label="Tax rate"
            value={invoice.taxRatePct != null ? `${invoice.taxRatePct}%` : "—"}
          />
          <Detail label="Reference" value={invoice.reference ?? "—"} />
          {invoice.terms ? <Detail label="Terms" value={invoice.terms} /> : null}
        </div>
        {invoice.paymentUrl ? (
          <a
            href={invoice.paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface-2 px-3 py-1.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface"
          >
            <ExternalLink className="h-4 w-4 text-bs-subtle" /> Payment link
          </a>
        ) : null}
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
                <td className="px-4 pt-3 text-sm text-bs-muted" colSpan={3}>
                  Subtotal
                </td>
                <td className="px-4 pt-3 text-right tabular-nums text-bs-text">
                  {money(lineTotalPence)}
                </td>
                <td />
              </tr>
              <tr className="bg-bs-surface-2">
                <td className="px-4 py-1 text-sm text-bs-muted" colSpan={3}>
                  Tax{invoice.taxRatePct != null ? ` (${invoice.taxRatePct}%)` : ""}
                </td>
                <td className="px-4 py-1 text-right tabular-nums text-bs-text">
                  {money(taxPence)}
                </td>
                <td />
              </tr>
              <tr className="bg-bs-surface-2">
                <td className="px-4 pb-3 pt-1 text-sm font-medium text-bs-text" colSpan={3}>
                  Grand total
                </td>
                <td className="px-4 pb-3 pt-1 text-right font-display text-h3 tabular-nums text-bs-text">
                  {money(grandTotalPence)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <AddLineItemForm invoiceId={invoice.id} />
      </section>

      {/* Danger zone */}
      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-bs-border bg-bs-surface p-5">
        <div>
          <h2 className="font-display text-h3 text-bs-text">Void invoice</h2>
          <p className="mt-0.5 text-sm text-bs-muted">
            Voiding archives this invoice and removes it from the Finance list.
          </p>
        </div>
        <VoidInvoiceForm invoiceId={invoice.id} />
      </section>

      <EditInvoiceDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        detail={detail}
        clientOptions={clientOptions}
        talentOptions={talentOptions}
        onSaved={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function VoidInvoiceForm({ invoiceId }: { invoiceId: string }) {
  return (
    <form
      action={voidInvoiceAction}
      onSubmit={(e) => {
        if (!window.confirm("Void this invoice? It will be archived.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Button type="submit" variant="danger">
        Void invoice
      </Button>
    </form>
  );
}

function EditInvoiceDialog({
  open,
  onClose,
  detail,
  clientOptions,
  talentOptions,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  detail: InvoiceDetail;
  clientOptions: Option[];
  talentOptions: Option[];
  onSaved: () => void;
}) {
  const { invoice } = detail;
  const [state, action, pending] = useActionState<UpdateInvoiceActionState, FormData>(
    updateInvoiceAction,
    {},
  );
  React.useEffect(() => {
    if (state?.ok) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onClose={onClose} title="Edit invoice">
      <form action={action} className="space-y-4">
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <div className="grid grid-cols-2 gap-3">
          <EditField label="Number">
            <input
              name="number"
              defaultValue={invoice.number ?? ""}
              placeholder="e.g. INV-0042"
              className={inputCls}
            />
          </EditField>
          <EditField label="Reference">
            <input
              name="reference"
              defaultValue={invoice.reference ?? ""}
              placeholder="PO / client ref"
              className={inputCls}
            />
          </EditField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <EditField label="Client">
            <select
              name="clientId"
              defaultValue={invoice.clientId ?? ""}
              className={cn(inputCls, "pr-8")}
            >
              <option value="">None</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </EditField>
          <EditField label="Pay to talent">
            <select
              name="talentId"
              defaultValue={invoice.talentId ?? ""}
              className={cn(inputCls, "pr-8")}
            >
              <option value="">— This is a client invoice —</option>
              {talentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </EditField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <EditField label="Issued">
            <input
              name="issuedAt"
              type="date"
              defaultValue={toDateInput(invoice.issuedAt)}
              className={inputCls}
            />
          </EditField>
          <EditField label="Due">
            <input
              name="dueAt"
              type="date"
              defaultValue={toDateInput(invoice.dueAt)}
              className={inputCls}
            />
          </EditField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <EditField label="Tax rate (%)">
            <input
              name="taxRatePct"
              type="number"
              step="1"
              min="0"
              max="100"
              defaultValue={invoice.taxRatePct ?? ""}
              placeholder="e.g. 20"
              className={inputCls}
            />
          </EditField>
          <EditField label="Payment link">
            <input
              name="paymentUrl"
              type="url"
              defaultValue={invoice.paymentUrl ?? ""}
              placeholder="https://…"
              className={inputCls}
            />
          </EditField>
        </div>
        <EditField label="Terms">
          <textarea
            name="terms"
            defaultValue={invoice.terms ?? ""}
            rows={3}
            placeholder="Payment terms"
            className={cn(inputCls, "h-auto py-2")}
          />
        </EditField>
        {state?.error ? <p className="text-sm text-bs-danger">{state.error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-bs-text">{label}</span>
      {children}
    </label>
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
