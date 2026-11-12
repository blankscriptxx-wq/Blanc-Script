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
import { createTalentAction } from "@/app/(app)/talent/actions";
import type { TalentRow } from "@/lib/data/talent";
import { TalentAppearances } from "@/components/castings/talent-appearances";
import type {
  ContentCasting,
  ProjectCasting,
  ShootCasting,
} from "@/lib/data/castings";
import { cn } from "@/lib/cn";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<TalentRow["status"], React.ComponentProps<typeof StatusPill>["tone"]> = {
  active: "success",
  inactive: "neutral",
  archived: "neutral",
};

function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

function rate(r: TalentRow): string {
  return r.ratePerHourPence == null
    ? "—"
    : `${gbp.format(r.ratePerHourPence / 100)} / hr`;
}

export function TalentView({
  rows,
  shootCastings = [],
  projectCastings = [],
  contentCastings = [],
}: {
  rows: TalentRow[];
  shootCastings?: ShootCasting[];
  projectCastings?: ProjectCasting[];
  contentCastings?: ContentCasting[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TalentRow | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "person" : "people"}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add talent
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No talent yet."
          description="Add on-camera talent to your book so you can cast them onto shoots and track rates."
          action={<Button onClick={() => setAddOpen(true)}>Add talent</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
          <table className="w-full text-left text-body">
            <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-bs-border last:border-0 transition-colors hover:bg-bs-surface-2"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-bs-text">{r.name}</div>
                    {r.tags.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-bs-surface-2 px-2 py-0.5 text-[11px] text-bs-subtle"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-bs-muted">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 text-bs-muted">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{rate(r)}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[r.status]}>{cap(r.status)}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddTalentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Talent"
        title={selected?.name ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            <Link
              href={`/talent/${selected.id}`}
              className="flex items-center justify-between rounded-sm border border-bs-border bg-bs-surface-2 px-3 py-2.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface"
            >
              View full profile
              <ArrowUpRight className="h-4 w-4 text-bs-subtle" />
            </Link>
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>{cap(selected.status)}</StatusPill>
            </Row>
            <Row label="Email">{selected.email ?? "—"}</Row>
            <Row label="Phone">{selected.phone ?? "—"}</Row>
            <Row label="Rate">
              <span className="tabular-nums">{rate(selected)}</span>
            </Row>
            <Row label="Added">
              {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                new Date(selected.createdAt),
              )}
            </Row>
            <div className="space-y-1.5 pt-1">
              <span className="text-sm text-bs-subtle">Notes</span>
              <p className="whitespace-pre-wrap text-sm text-bs-text">
                {selected.notes ?? "—"}
              </p>
            </div>
            <TalentAppearances
              shoots={shootCastings.filter((c) => c.talentId === selected.id)}
              projects={projectCastings.filter((c) => c.talentId === selected.id)}
              content={contentCastings.filter((c) => c.talentId === selected.id)}
            />
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

function AddTalentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createTalentAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="Add talent">
      <form action={action} className="space-y-4">
        <Field label="Name">
          <input name="name" required autoFocus placeholder="e.g. Jordan Reyes" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email (optional)">
            <input name="email" type="email" placeholder="name@example.com" className={inputCls} />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" type="text" placeholder="07…" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Hourly (£)">
            <input name="ratePerHour" type="number" step="1" min="0" placeholder="45" className={inputCls} />
          </Field>
          <Field label="Day rate (£)">
            <input name="dayRate" type="number" step="1" min="0" placeholder="350" className={inputCls} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="active" className={cn(inputCls, "pr-8")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <Field label="Skills / tags (comma separated)">
          <input name="tags" placeholder="presenter, voiceover, model" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base location (optional)">
            <input name="baseLocation" placeholder="London" className={inputCls} />
          </Field>
          <Field label="Instagram (optional)">
            <input name="instagram" placeholder="@handle" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Agent / rep (optional)">
            <input name="agentName" placeholder="Agency name" className={inputCls} />
          </Field>
          <Field label="Agent contact (optional)">
            <input name="agentContact" placeholder="email or phone" className={inputCls} />
          </Field>
        </div>
        <div className="rounded-sm border border-bs-border p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-bs-subtle">
            Payment details (optional)
          </p>
          <Field label="Account name">
            <input name="bankAccountName" placeholder="Name on the account" className={inputCls} />
          </Field>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Sort code">
              <input name="bankSortCode" placeholder="12-34-56" className={inputCls} />
            </Field>
            <Field label="Account number">
              <input name="bankAccountNumber" placeholder="12345678" className={inputCls} />
            </Field>
          </div>
          <p className="mt-2 text-[11px] text-bs-subtle">
            Visible only to people who can see talent pay.
          </p>
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add talent"}
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
