"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Users,
  FolderKanban,
  Camera,
  Receipt,
  Activity,
  Mail,
  Phone,
} from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { Button } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { addContactAction } from "@/app/(os)/(app)/clients/[id]/actions";
import { DraftSummaryButton, DraftEmailButton } from "@/components/clients/client-ai";
import type {
  ClientProfile,
  ClientProfileProjectStatus,
  ClientProfileShootStatus,
} from "@/lib/data/client-profile";
import type { InvoiceStatus } from "@/lib/data/finance";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const CLIENT_STATUS: Record<
  ClientProfile["client"]["status"],
  { label: string; tone: Tone }
> = {
  lead: { label: "Lead", tone: "info" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  churned: { label: "Churned", tone: "neutral" },
};
const PROJECT_STATUS: Record<
  ClientProfileProjectStatus,
  { label: string; tone: Tone }
> = {
  planning: { label: "Planning", tone: "neutral" },
  active: { label: "Active", tone: "info" },
  on_hold: { label: "On hold", tone: "warning" },
  complete: { label: "Complete", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};
const SHOOT_STATUS: Record<
  ClientProfileShootStatus,
  { label: string; tone: Tone }
> = {
  booked: { label: "Booked", tone: "info" },
  on_site: { label: "On site", tone: "warning" },
  wrapped: { label: "Wrapped", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};
const INV_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  approved: { label: "Approved", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
};

function money(p: number | null): string {
  return p == null ? "—" : gbp.format(p / 100);
}

function humanAction(action: string): string {
  const labels: Record<string, string> = {
    "client.created": "Client created",
    "client.contact.added": "Contact added",
  };
  if (labels[action]) return labels[action];
  return action
    .split(".")
    .join(" · ")
    .replace(/_/g, " ")
    .replace(/^\w/, (ch) => ch.toUpperCase());
}

export function ClientProfileView({ profile }: { profile: ClientProfile }) {
  const { client: c, summary, contacts, projects, shoots, invoices, activity } =
    profile;
  const [addOpen, setAddOpen] = React.useState(false);

  const tiles = [
    { label: "Projects", value: String(summary.projectsCount) },
    { label: "Shoots", value: String(summary.shootsCount) },
    { label: "Outstanding", value: money(summary.outstandingPence), hint: "awaiting payment" },
    { label: "Plan", value: summary.planName ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      {/* Header */}
      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-bs-text">{c.name}</h1>
          <StatusPill tone={CLIENT_STATUS[c.status].tone}>
            {CLIENT_STATUS[c.status].label}
          </StatusPill>
          <Link
            href={`/clients/${c.id}/strategy`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-bs-primary px-3 py-1.5 text-sm font-medium text-bs-on-accent transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> AI Strategist
          </Link>
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Plan" value={summary.planName ?? "—"} />
          <Detail label="Monthly (ex VAT)" value={money(summary.mrrPence)} />
          <Detail label="Currency" value={c.currency} />
          <Detail label="Client since" value={dateFmt.format(new Date(c.createdAt))} />
        </div>
        <div className="mt-4 border-t border-bs-border pt-4">
          <DraftSummaryButton clientId={c.id} />
        </div>
      </div>

      {/* Summary tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((k) => (
          <div key={k.label} className="rounded-md border border-bs-border bg-bs-surface p-4">
            <div className="text-eyebrow uppercase text-bs-subtle">{k.label}</div>
            <div className="mt-1 font-display text-h2 text-bs-text tabular-nums">{k.value}</div>
            {k.hint ? <div className="mt-0.5 text-xs text-bs-subtle">{k.hint}</div> : null}
          </div>
        ))}
      </div>

      {/* Contacts */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-bs-subtle" />
            <h2 className="font-display text-h3">Contacts</h2>
          </div>
          <div className="flex items-center gap-2">
            <DraftEmailButton clientId={c.id} />
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add contact
            </Button>
          </div>
        </div>
        {contacts.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            No contacts yet. Add the people you deal with at {c.name}.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map((ct) => (
              <div
                key={ct.id}
                className="rounded-md border border-bs-border bg-bs-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-bs-text">{ct.name}</span>
                  {ct.isPrimary ? <StatusPill tone="gold">Primary</StatusPill> : null}
                </div>
                {ct.roleTitle ? (
                  <div className="mt-0.5 text-xs text-bs-subtle">{ct.roleTitle}</div>
                ) : null}
                {ct.email || ct.phone ? (
                  <div className="mt-2 space-y-1 text-sm">
                    {ct.email ? (
                      <a
                        href={`mailto:${ct.email}`}
                        className="flex items-center gap-1.5 text-bs-muted transition-colors hover:text-bs-text"
                      >
                        <Mail className="h-3.5 w-3.5 text-bs-subtle" /> {ct.email}
                      </a>
                    ) : null}
                    {ct.phone ? (
                      <a
                        href={`tel:${ct.phone}`}
                        className="flex items-center gap-1.5 text-bs-muted transition-colors hover:text-bs-text"
                      >
                        <Phone className="h-3.5 w-3.5 text-bs-subtle" /> {ct.phone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Projects */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Projects</h2>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            No projects for this client yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-bs-border bg-bs-surface px-3 py-2.5"
              >
                <span className="text-sm font-medium text-bs-text">{p.name}</span>
                <StatusPill tone={PROJECT_STATUS[p.status].tone}>
                  {PROJECT_STATUS[p.status].label}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shoots */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Camera className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Shoots</h2>
        </div>
        {shoots.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            No shoots booked for this client yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {shoots.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-sm border border-bs-border bg-bs-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-bs-text">{s.title}</div>
                  {s.scheduledAt ? (
                    <div className="mt-0.5 text-xs text-bs-subtle">
                      {dateFmt.format(new Date(s.scheduledAt))}
                    </div>
                  ) : null}
                </div>
                <StatusPill tone={SHOOT_STATUS[s.status].tone}>
                  {SHOOT_STATUS[s.status].label}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invoices */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            No invoices raised for this client yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-sm border border-bs-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((r) => (
                  <tr key={r.id} className="border-b border-bs-border last:border-0">
                    <td className="px-3 py-2 text-bs-text">{r.number ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-bs-text">
                      {gbp.format(r.amountPence / 100)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={INV_STATUS[r.status].tone}>
                        {INV_STATUS[r.status].label}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 text-bs-muted tabular-nums">
                      {r.dueAt ? dateFmt.format(new Date(r.dueAt)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Recent activity</h2>
        </div>
        {activity.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            Nothing logged for this client yet.
          </p>
        ) : (
          <ul className="space-y-0">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 border-b border-bs-border py-2.5 last:border-0"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-bs-border-strong" />
                <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm text-bs-text">{humanAction(a.action)}</span>
                  <span className="text-xs tabular-nums text-bs-subtle">
                    {dateTimeFmt.format(new Date(a.createdAt))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddContactDialog
        open={addOpen}
        clientId={c.id}
        onClose={() => setAddOpen(false)}
      />
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

function AddContactDialog({
  open,
  clientId,
  onClose,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addContactAction, null);
  React.useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="Add contact">
      <form action={action} className="space-y-4">
        <input type="hidden" name="clientId" value={clientId} />
        <Field label="Name">
          <input name="name" required autoFocus placeholder="e.g. Priya Shah" className={inputCls} />
        </Field>
        <Field label="Role (optional)">
          <input name="roleTitle" placeholder="e.g. Marketing Director" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email (optional)">
            <input name="email" type="email" placeholder="name@example.com" className={inputCls} />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" type="text" placeholder="07…" className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-bs-text">
          <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded-sm border-bs-border-strong" />
          Primary contact
        </label>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add contact"}
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
