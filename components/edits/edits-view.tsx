"use client";

import { useOpenOnNewParam } from "@/lib/use-new-param";
import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Dialog } from "@/components/ds/dialog";
import { Sheet } from "@/components/ds/sheet";
import { EmptyState } from "@/components/ds/empty-state";
import { createDeliverableAction } from "@/app/(os)/(app)/edits/actions";
import type { DeliverableRow, DeliverableStatus } from "@/lib/data/edits";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<
  DeliverableStatus,
  React.ComponentProps<typeof StatusPill>["tone"]
> = {
  editing: "neutral",
  in_review: "info",
  changes_requested: "warning",
  approved: "success",
  published: "accent",
};

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  editing: "Editing",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
};

const COLUMNS: DeliverableStatus[] = [
  "editing",
  "in_review",
  "changes_requested",
  "approved",
  "published",
];

const fmtDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function EditsView({
  rows,
  projectOptions,
  clientOptions,
}: {
  rows: DeliverableRow[];
  projectOptions: { id: string; name: string }[];
  clientOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  useOpenOnNewParam(setAddOpen);
  const [selected, setSelected] = React.useState<DeliverableRow | null>(null);

  const grouped = React.useMemo(() => {
    const map: Record<DeliverableStatus, DeliverableRow[]> = {
      editing: [],
      in_review: [],
      changes_requested: [],
      approved: [],
      published: [],
    };
    for (const r of rows) map[r.status].push(r);
    return map;
  }, [rows]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "deliverable" : "deliverables"} in the queue
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> New deliverable
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing in the queue."
          description="Add a deliverable to move a cut from editing through review to approved and published."
          action={<Button onClick={() => setAddOpen(true)}>New deliverable</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((status) => {
            const items = grouped[status];
            return (
              <section key={status} className="flex flex-col gap-3">
                <header className="flex items-center justify-between gap-2">
                  <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>
                  <span className="text-xs tabular-nums text-bs-subtle">{items.length}</span>
                </header>
                <div className="flex flex-col gap-2.5">
                  {items.length === 0 ? (
                    <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-3 py-6 text-center text-xs text-bs-subtle">
                      None
                    </p>
                  ) : (
                    items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelected(r)}
                        className="w-full rounded-md border border-bs-border bg-bs-surface p-3 text-left transition-colors hover:bg-bs-surface-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-bs-text">{r.title}</span>
                          {r.versionLabel ? (
                            <StatusPill tone="gold" className="shrink-0">
                              {r.versionLabel}
                            </StatusPill>
                          ) : null}
                        </div>
                        {r.projectName || r.clientName ? (
                          <p className="mt-1 truncate text-xs text-bs-muted">
                            {[r.projectName, r.clientName].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        {r.dueAt ? (
                          <p className="mt-1.5 text-xs text-bs-subtle">
                            Due {fmtDate.format(new Date(r.dueAt))}
                          </p>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AddDeliverableDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Deliverable"
        title={selected?.title ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            <Link
              href={`/edits/${selected.id}`}
              className="flex items-center justify-between rounded-sm border border-bs-border bg-bs-surface-2 px-3 py-2.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface"
            >
              View / review
              <ArrowUpRight className="h-4 w-4 text-bs-subtle" />
            </Link>
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {STATUS_LABEL[selected.status]}
              </StatusPill>
            </Row>
            <Row label="Version">{selected.versionLabel ?? "—"}</Row>
            <Row label="Project">{selected.projectName ?? "—"}</Row>
            <Row label="Client">{selected.clientName ?? "—"}</Row>
            <Row label="Due">
              {selected.dueAt ? fmtDate.format(new Date(selected.dueAt)) : "—"}
            </Row>
            <Row label="Updated">{fmtDate.format(new Date(selected.updatedAt))}</Row>
            <Row label="Preview">
              {selected.previewUrl ? (
                <a
                  href={selected.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-bs-primary underline-offset-4 hover:underline"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "—"
              )}
            </Row>
            <div className="border-b border-bs-border pb-3 last:border-0">
              <span className="text-sm text-bs-subtle">Notes</span>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-bs-text">
                {selected.notes?.trim() ? selected.notes : "No review notes yet."}
              </p>
            </div>
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

function AddDeliverableDialog({
  open,
  onClose,
  projectOptions,
  clientOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectOptions: { id: string; name: string }[];
  clientOptions: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createDeliverableAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="New deliverable">
      <form action={action} className="space-y-4">
        <Field label="Title">
          <input
            name="title"
            required
            autoFocus
            placeholder="e.g. Spring campaign — hero cut"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project (optional)">
            <select name="projectId" defaultValue="" className={cn(inputCls, "pr-8")}>
              <option value="">None</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Version label">
            <input name="versionLabel" placeholder="e.g. v1" className={inputCls} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="editing" className={cn(inputCls, "pr-8")}>
              <option value="editing">Editing</option>
              <option value="in_review">In review</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>
        <Field label="Preview URL (optional)">
          <input
            name="previewUrl"
            type="url"
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
        <Field label="Due date (optional)">
          <input name="dueAt" type="date" className={inputCls} />
        </Field>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add deliverable"}
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
