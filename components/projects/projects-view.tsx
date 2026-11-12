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
import { createProjectAction } from "@/app/(app)/projects/actions";
import type { ProjectRow } from "@/lib/data/projects";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<
  ProjectRow["status"],
  React.ComponentProps<typeof StatusPill>["tone"]
> = {
  active: "success",
  planning: "info",
  on_hold: "warning",
  complete: "accent",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<ProjectRow["status"], string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  cancelled: "Cancelled",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function ProjectsView({
  rows,
  clientOptions,
}: {
  rows: ProjectRow[];
  clientOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProjectRow | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "project" : "projects"}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add project
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No projects yet."
          description="Add your first project to plan delivery, attach a client and track progress."
          action={<Button onClick={() => setAddOpen(true)}>Add a project</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
          <table className="w-full text-left text-body">
            <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
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
                  <td className="px-4 py-3 text-bs-muted">{r.clientName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-bs-muted">
                    {dateFmt.format(new Date(r.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddProjectDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientOptions={clientOptions}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Project"
        title={selected?.name ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {STATUS_LABEL[selected.status]}
              </StatusPill>
            </Row>
            <Row label="Client">{selected.clientName ?? "—"}</Row>
            <Row label="Created">
              {dateFmt.format(new Date(selected.createdAt))}
            </Row>
            <Row label="Updated">
              {dateFmt.format(new Date(selected.updatedAt))}
            </Row>
            <p className="pt-2 text-xs text-bs-subtle">
              Tasks, shoots and deliverables attach here as those modules come
              online.
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

function AddProjectDialog({
  open,
  onClose,
  clientOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clientOptions: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createProjectAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="Add project">
      <form action={action} className="space-y-4">
        <Field label="Project name">
          <input
            name="name"
            required
            autoFocus
            placeholder="e.g. Autumn campaign"
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
          <Field label="Status">
            <select name="status" defaultValue="planning" className={cn(inputCls, "pr-8")}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="complete">Complete</option>
              <option value="cancelled">Cancelled</option>
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
            {pending ? "Adding…" : "Add project"}
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
