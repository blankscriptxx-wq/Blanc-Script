"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Dialog } from "@/components/ds/dialog";
import { Sheet } from "@/components/ds/sheet";
import { EmptyState } from "@/components/ds/empty-state";
import { PulseDot } from "@/components/ds/motion";
import { createShootAction } from "@/app/(app)/shoots/actions";
import type { ShootRow } from "@/lib/data/shoots";
import { CastingSection } from "@/components/castings/casting-section";
import type { ShootCasting, TalentPickerOption } from "@/lib/data/castings";
import { cn } from "@/lib/cn";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<ShootRow["status"], React.ComponentProps<typeof StatusPill>["tone"]> = {
  booked: "info",
  on_site: "accent",
  wrapped: "success",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<ShootRow["status"], string> = {
  booked: "Booked",
  on_site: "On site",
  wrapped: "Wrapped",
  cancelled: "Cancelled",
};

function formatDate(d: Date | null): string {
  return d == null ? "—" : dateFmt.format(new Date(d));
}

function ShootStatus({ status }: { status: ShootRow["status"] }) {
  return (
    <StatusPill
      tone={STATUS_TONE[status]}
      icon={status === "on_site" ? <PulseDot tone="accent" /> : undefined}
    >
      {STATUS_LABEL[status]}
    </StatusPill>
  );
}

export function ShootsView({
  rows,
  clientOptions,
  castings = [],
  talentOptions = [],
}: {
  rows: ShootRow[];
  clientOptions: { id: string; name: string }[];
  castings?: ShootCasting[];
  talentOptions?: TalentPickerOption[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ShootRow | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "shoot" : "shoots"}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Book a shoot
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No shoots booked yet."
          description="Book your first shoot to plan production, track on-site days and wrap deliverables."
          action={<Button onClick={() => setAddOpen(true)}>Book a shoot</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
          <table className="w-full text-left text-body">
            <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Shoot</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-bs-border last:border-0 transition-colors hover:bg-bs-surface-2"
                >
                  <td className="px-4 py-3 font-medium text-bs-text">{r.title}</td>
                  <td className="px-4 py-3 text-bs-muted">{r.clientName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ShootStatus status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-bs-muted tabular-nums">{formatDate(r.scheduledAt)}</td>
                  <td className="px-4 py-3 text-bs-muted">{r.locationName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BookShootDialog
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
        eyebrow="Shoot"
        title={selected?.title ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            <Row label="Status">
              <ShootStatus status={selected.status} />
            </Row>
            <Row label="Client">{selected.clientName ?? "—"}</Row>
            <Row label="Date">
              <span className="tabular-nums">{formatDate(selected.scheduledAt)}</span>
            </Row>
            <Row label="Location">{selected.locationName ?? "—"}</Row>
            <Row label="Booked">
              <span className="tabular-nums">{formatDate(selected.createdAt)}</span>
            </Row>
            <CastingSection
              kind="shoot"
              parentId={selected.id}
              items={castings.filter((c) => c.shootId === selected.id)}
              talentOptions={talentOptions}
            />
            <p className="pt-2 text-xs text-bs-subtle">
              Call sheets, crew, edits and deliverables attach here as those
              modules come online.
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

function BookShootDialog({
  open,
  onClose,
  clientOptions,
  talentOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clientOptions: { id: string; name: string }[];
  talentOptions: TalentPickerOption[];
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createShootAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="Book a shoot">
      <form action={action} className="space-y-4">
        <Field label="Shoot title">
          <input
            name="title"
            required
            autoFocus
            placeholder="e.g. Autumn campaign — studio day"
            className={inputCls}
          />
        </Field>
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
          <Field label="Date & time (optional)">
            <input type="datetime-local" name="scheduledAt" className={inputCls} />
          </Field>
        </div>
        <Field label="Location (optional)">
          <input
            name="locationName"
            placeholder="e.g. Blanc Studio, London"
            className={inputCls}
          />
        </Field>
        {talentOptions.length > 0 ? (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-bs-text">
              Attach talent (optional)
            </span>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-sm border border-bs-border-strong p-2">
              {talentOptions.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-bs-text transition-colors hover:bg-bs-surface-2"
                >
                  <input
                    type="checkbox"
                    name="talentIds"
                    value={t.id}
                    className="h-4 w-4 accent-bs-accent"
                  />
                  <span>{t.name}</span>
                  {t.ratePerHourPence != null ? (
                    <span className="ml-auto text-xs text-bs-subtle">
                      {gbp.format(t.ratePerHourPence / 100)}/hr
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
            <p className="text-xs text-bs-subtle">
              Pencilled onto the shoot — set call times &amp; rates after booking.
            </p>
          </div>
        ) : null}
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Booking…" : "Book shoot"}
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
