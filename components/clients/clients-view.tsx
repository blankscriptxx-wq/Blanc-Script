"use client";

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
import { createClientAction } from "@/app/(app)/clients/actions";
import type { ClientRow } from "@/lib/data/clients";
import { cn } from "@/lib/cn";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<ClientRow["status"], React.ComponentProps<typeof StatusPill>["tone"]> = {
  active: "success",
  lead: "info",
  paused: "warning",
  churned: "neutral",
};

function mrr(r: ClientRow): string {
  const pence = r.retainerOverridePence ?? r.planPricePence;
  return pence == null ? "—" : gbp.format(pence / 100);
}

export function ClientsView({
  rows,
  planOptions,
}: {
  rows: ClientRow[];
  planOptions: { id: string; name: string; pricePence: number | null }[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ClientRow | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "client" : "clients"}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add client
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No clients yet."
          description="Add your first client to start a pipeline, book shoots and track retainers."
          action={<Button onClick={() => setAddOpen(true)}>Add a client</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
          <table className="w-full text-left text-body">
            <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 text-right font-medium">MRR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-bs-border last:border-0 transition-colors hover:bg-bs-surface-2"
                >
                  <td className="px-4 py-3 font-medium text-bs-text">{r.name}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[r.status]}>
                      {r.status[0].toUpperCase() + r.status.slice(1)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-bs-muted">{r.planName ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{mrr(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddClientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        planOptions={planOptions}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Client"
        title={selected?.name ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            <Link
              href={`/clients/${selected.id}`}
              className="flex items-center justify-between rounded-sm border border-bs-border bg-bs-surface-2 px-3 py-2.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface"
            >
              View full profile
              <ArrowUpRight className="h-4 w-4 text-bs-subtle" />
            </Link>
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {selected.status[0].toUpperCase() + selected.status.slice(1)}
              </StatusPill>
            </Row>
            <Row label="Plan">{selected.planName ?? "—"}</Row>
            <Row label="Monthly (ex VAT)">
              <span className="tabular-nums">{mrr(selected)}</span>
            </Row>
            <Row label="Added">
              {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                new Date(selected.createdAt),
              )}
            </Row>
            <p className="pt-2 text-xs text-bs-subtle">
              Shoots, projects, brand kit and the monthly checklist attach here as
              those modules come online.
            </p>
          </div>
        ) : null}
      </Sheet>
    </>
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

function AddClientDialog({
  open,
  onClose,
  planOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  planOptions: { id: string; name: string; pricePence: number | null }[];
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createClientAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="Add client">
      <form action={action} className="space-y-4">
        <Field label="Client name">
          <input name="name" required autoFocus placeholder="e.g. Aura Skincare" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select name="status" defaultValue="lead" className={cn(inputCls, "pr-8")}>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </Field>
          <Field label="Plan (optional)">
            <select name="servicePlanId" defaultValue="" className={cn(inputCls, "pr-8")}>
              <option value="">None</option>
              {planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.pricePence != null ? ` · ${gbp.format(p.pricePence / 100)}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add client"}
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
