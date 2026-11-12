"use client";

import { useOpenOnNewParam } from "@/lib/use-new-param";
import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Dialog } from "@/components/ds/dialog";
import { Sheet } from "@/components/ds/sheet";
import { EmptyState } from "@/components/ds/empty-state";
import { Spotlight, CountUp } from "@/components/ds/motion";
import {
  createInvoiceAction,
  draftTalentPaymentsAction,
} from "@/app/(os)/(app)/finance/actions";
import type { InvoiceRow, InvoiceStatus, FinanceSummary } from "@/lib/data/finance";
import { cn } from "@/lib/cn";

const STATUS_FILTERS: InvoiceStatus[] = ["draft", "sent", "approved", "paid", "overdue"];

const filterCls =
  "h-9 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const STATUS_TONE: Record<InvoiceStatus, React.ComponentProps<typeof StatusPill>["tone"]> = {
  draft: "neutral",
  sent: "info",
  approved: "accent",
  paid: "success",
  overdue: "danger",
};

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

function fmtDate(d: Date | null): string {
  return d ? dateFmt.format(new Date(d)) : "—";
}

export function FinanceView({
  rows,
  summary,
  clientOptions,
  talentOptions = [],
}: {
  rows: InvoiceRow[];
  summary: FinanceSummary;
  clientOptions: { id: string; name: string }[];
  talentOptions?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  useOpenOnNewParam(setAddOpen);
  const [selected, setSelected] = React.useState<InvoiceRow | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<"all" | InvoiceStatus>("all");
  const [partyFilter, setPartyFilter] = React.useState<string>("all");

  const [draftState, draftAction, draftPending] = useActionState(
    draftTalentPaymentsAction,
    null,
  );
  React.useEffect(() => {
    if (draftState?.ok) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftState]);

  function partyOf(r: InvoiceRow): string {
    return r.talentName ?? r.clientName ?? "Blanc Script";
  }

  const partyOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) names.add(partyOf(r));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = rows.filter(
    (r) =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (partyFilter === "all" || partyOf(r) === partyFilter),
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Outstanding">
          <CountUp value={summary.outstandingPence / 100} prefix="£" />
        </SummaryTile>
        <SummaryTile label="Paid this month">
          <CountUp value={summary.paidThisMonthPence / 100} prefix="£" />
        </SummaryTile>
        <SummaryTile label="Overdue">
          <CountUp value={summary.overdueCount} />
        </SummaryTile>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | InvoiceStatus)}
            className={filterCls}
          >
            <option value="all">All statuses</option>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by client or talent"
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className={filterCls}
          >
            <option value="all">All clients &amp; talent</option>
            {partyOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="text-sm text-bs-muted">
            {filteredRows.length} {filteredRows.length === 1 ? "invoice" : "invoices"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draftState?.ok ? (
            <span className="text-sm text-bs-muted">
              {draftState.created === 0
                ? "No new drafts to create."
                : `Drafted ${draftState.created} talent ${
                    draftState.created === 1 ? "payment" : "payments"
                  }.`}
            </span>
          ) : draftState && !draftState.ok ? (
            <span className="text-sm text-bs-danger">{draftState.error}</span>
          ) : null}
          <form action={draftAction}>
            <Button type="submit" variant="ghost" disabled={draftPending}>
              {draftPending ? "Drafting…" : "Draft talent payments"}
            </Button>
          </form>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet."
          description="Raise your first invoice to track what's outstanding, approved and paid."
          action={<Button onClick={() => setAddOpen(true)}>New invoice</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
          <table className="w-full text-left text-body">
            <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Number</th>
                <th className="px-4 py-2.5 font-medium">Client / payee</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-bs-subtle">
                    No invoices match these filters.
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-bs-border last:border-0 transition-colors hover:bg-bs-surface-2"
                >
                  <td className="px-4 py-3 font-medium text-bs-text">{r.number ?? "—"}</td>
                  <td className="px-4 py-3 text-bs-muted">
                    {r.talentName ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.talentName}
                        <StatusPill tone="gold">Talent pay</StatusPill>
                      </span>
                    ) : (
                      (r.clientName ?? "Blanc Script")
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {gbp.format(r.amountPence / 100)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[r.status]}>{titleCase(r.status)}</StatusPill>
                  </td>
                  <td className="px-4 py-3 text-bs-muted">{fmtDate(r.dueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewInvoiceDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientOptions={clientOptions}
        talentOptions={talentOptions}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Invoice"
        title={selected?.number ?? "Invoice"}
      >
        {selected ? (
          <div className="space-y-4">
            <Link
              href={`/finance/${selected.id}`}
              className="flex items-center justify-between rounded-sm border border-bs-border bg-bs-surface-2 px-3 py-2.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface"
            >
              View invoice
              <ArrowUpRight className="h-4 w-4 text-bs-subtle" />
            </Link>
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {titleCase(selected.status)}
              </StatusPill>
            </Row>
            <Row label={selected.talentName ? "Pay to talent" : "Client"}>
              {selected.talentName ?? selected.clientName ?? "Blanc Script"}
            </Row>
            <Row label="Amount">
              <span className="tabular-nums">{gbp.format(selected.amountPence / 100)}</span>
            </Row>
            <Row label="Due">{fmtDate(selected.dueAt)}</Row>
            <Row label="Raised">{fmtDate(selected.createdAt)}</Row>
            <a
              href={`/finance/${selected.id}`}
              className="inline-block pt-2 text-sm font-medium text-bs-primary hover:underline"
            >
              Open invoice — line items, payment link and print view
            </a>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function SummaryTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Spotlight className="rounded-md border border-bs-border bg-bs-surface p-4">
      <div className="text-eyebrow uppercase text-bs-subtle">{label}</div>
      <div className="mt-1 font-display text-h2 text-bs-text">{children}</div>
    </Spotlight>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-bs-border pb-3 last:border-0">
      <span className="text-sm text-bs-subtle">{label}</span>
      <span className="text-sm text-bs-text">{children}</span>
    </div>
  );
}

function NewInvoiceDialog({
  open,
  onClose,
  clientOptions,
  talentOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clientOptions: { id: string; name: string }[];
  talentOptions: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createInvoiceAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="New invoice">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client (optional)">
            <select name="clientId" defaultValue="" className={cn(inputCls, "pr-8")}>
              <option value="">None</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number (optional)">
            <input name="number" placeholder="e.g. INV-0042" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (£)">
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="draft" className={cn(inputCls, "pr-8")}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </Field>
        </div>
        <Field label="Due date (optional)">
          <input name="dueAt" type="date" className={inputCls} />
        </Field>
        {talentOptions.length > 0 ? (
          <Field label="Pay to talent (optional)">
            <select name="talentId" defaultValue="" className={cn(inputCls, "pr-8")}>
              <option value="">— This is a client invoice —</option>
              {talentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {state && !state.ok ? <p className="text-sm text-bs-danger">{state.error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create invoice"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-bs-text">{label}</span>
      {children}
    </label>
  );
}
