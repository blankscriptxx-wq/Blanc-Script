"use client";
import * as React from "react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { StatusPill } from "@/components/ds/status-pill";
import { cn } from "@/lib/cn";
import {
  archiveAddonAction,
  createAddonAction,
  updateAddonAction,
  type AddonsActionState,
} from "@/app/(app)/settings/addons-actions";
import { ADDON_CADENCES, ADDON_CADENCE_LABELS } from "@/lib/addons-constants";
import type { AddOnRow } from "@/lib/data/addons";

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";
const labelCls = "block text-sm font-medium text-bs-text";

function formatPrice(addon: AddOnRow): string {
  if (addon.cadence === "bespoke" || addon.pricePence == null) return "Bespoke";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(addon.pricePence / 100);
}

/** Shared field set for both the add and edit dialogs. */
function AddonFields({ addon }: { addon?: AddOnRow }) {
  const [bespoke, setBespoke] = useState(addon?.cadence === "bespoke");

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className={labelCls}>Name</span>
        <input
          name="name"
          defaultValue={addon?.name}
          required
          minLength={2}
          maxLength={80}
          placeholder="AI Inbox"
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className={labelCls}>Cadence</span>
          <select
            name="cadence"
            defaultValue={addon?.cadence ?? "monthly"}
            className={inputCls}
            onChange={(e) => setBespoke(e.target.value === "bespoke")}
          >
            {ADDON_CADENCES.map((c) => (
              <option key={c} value={c}>
                {ADDON_CADENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Price (£)</span>
          <input
            name="price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={
              addon && addon.pricePence != null ? addon.pricePence / 100 : ""
            }
            disabled={bespoke}
            placeholder={bespoke ? "—" : "250"}
            className={cn(inputCls, bespoke && "opacity-50")}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelCls}>Free with package code</span>
        <input
          name="freeWithPlanCode"
          defaultValue={addon?.freeWithPlanCode ?? ""}
          maxLength={40}
          placeholder="HEADLINE (optional)"
          className={inputCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className={labelCls}>Notes</span>
        <textarea
          name="notes"
          defaultValue={addon?.notes ?? ""}
          maxLength={500}
          rows={2}
          placeholder="What this add-on includes (optional)"
          className="w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-body text-bs-text outline-none placeholder:text-bs-subtle"
        />
      </label>

      <label className="block space-y-1.5">
        <span className={labelCls}>Sort order</span>
        <input
          name="sortOrder"
          type="number"
          step="1"
          defaultValue={addon?.sortOrder ?? 0}
          className={inputCls}
        />
      </label>
    </div>
  );
}

function DialogFooter({
  pending,
  state,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  state: AddonsActionState;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <>
      {state.error ? (
        <p className="mt-3 text-sm text-bs-danger">{state.error}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </>
  );
}

function AddAddonDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState<AddonsActionState, FormData>(
    createAddonAction,
    {},
  );
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add add-on"
      description="Create an extra service billed on top of a retainer."
    >
      <form action={action}>
        <AddonFields />
        <DialogFooter
          pending={pending}
          state={state}
          submitLabel="Add add-on"
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function EditAddonDialog({
  addon,
  onClose,
}: {
  addon: AddOnRow | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<AddonsActionState, FormData>(
    updateAddonAction,
    {},
  );
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Dialog
      open={addon != null}
      onClose={onClose}
      title="Edit add-on"
      description={addon ? `Update ${addon.name}.` : ""}
    >
      {addon ? (
        <form action={action}>
          <input type="hidden" name="id" value={addon.id} />
          {/* key resets inner field state when switching between rows */}
          <AddonFields key={addon.id} addon={addon} />
          <DialogFooter
            pending={pending}
            state={state}
            submitLabel="Save changes"
            onCancel={onClose}
          />
        </form>
      ) : null}
    </Dialog>
  );
}

function ArchiveButton({ addon }: { addon: AddOnRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${addon.name}`}
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Remove the “${addon.name}” add-on? This cannot be undone.`,
            )
          ) {
            return;
          }
          const fd = new FormData();
          fd.set("id", addon.id);
          startTransition(async () => {
            const res = await archiveAddonAction(fd);
            if (res.error) setError(res.error);
          });
        }}
      >
        <Trash2 className="h-4 w-4 text-bs-danger" />
      </Button>
      {error ? (
        <span className="ml-2 text-xs text-bs-danger" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}

export function AddonsEditor({ addons }: { addons: AddOnRow[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AddOnRow | null>(null);

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-end">
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add add-on
        </Button>
      </div>

      {addons.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border px-4 py-6 text-center text-sm text-bs-subtle">
          No add-ons yet. Add your first extra service.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-bs-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
                <th className="px-4 py-2.5 font-medium">Add-on</th>
                <th className="px-4 py-2.5 font-medium">Price</th>
                <th className="px-4 py-2.5 font-medium">Cadence</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon) => (
                <tr key={addon.id} className="border-b border-bs-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-bs-text">{addon.name}</span>
                      {addon.freeWithPlanCode ? (
                        <StatusPill tone="success">
                          Free with {addon.freeWithPlanCode}
                        </StatusPill>
                      ) : null}
                    </div>
                    {addon.notes ? (
                      <p className="mt-0.5 text-xs text-bs-subtle">{addon.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-bs-text">{formatPrice(addon)}</td>
                  <td className="px-4 py-3 text-bs-muted">
                    {ADDON_CADENCE_LABELS[addon.cadence]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${addon.name}`}
                        onClick={() => setEditing(addon)}
                      >
                        <Pencil className="h-4 w-4 text-bs-muted" />
                      </Button>
                      <ArchiveButton addon={addon} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddAddonDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditAddonDialog addon={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
