"use client";
import * as React from "react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { StatusPill } from "@/components/ds/status-pill";
import { cn } from "@/lib/cn";
import {
  archivePlanAction,
  createPlanAction,
  updatePlanAction,
  type PackagesActionState,
} from "@/app/(os)/(app)/settings/packages-actions";
import type { ServicePlanRow } from "@/lib/data/service-plans";

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";
const labelCls = "block text-sm font-medium text-bs-text";

function formatPrice(plan: ServicePlanRow): string {
  if (plan.bespoke || plan.pricePence == null) return "Bespoke";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(plan.pricePence / 100);
}

/** Shared field set for both the add and edit dialogs. */
function PlanFields({ plan }: { plan?: ServicePlanRow }) {
  const [bespoke, setBespoke] = useState(plan?.bespoke ?? false);

  return (
    <div className="space-y-4">
      {plan ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-bs-subtle">Code</span>
          <code className="rounded-sm bg-bs-surface-2 px-2 py-0.5 text-sm text-bs-muted">
            {plan.code}
          </code>
        </div>
      ) : (
        <label className="block space-y-1.5">
          <span className={labelCls}>Code</span>
          <input
            name="code"
            required
            maxLength={40}
            placeholder="PRIME_TIME"
            className={inputCls}
          />
        </label>
      )}

      <label className="block space-y-1.5">
        <span className={labelCls}>Name</span>
        <input
          name="name"
          defaultValue={plan?.name}
          required
          minLength={2}
          maxLength={80}
          placeholder="Prime Time"
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className={labelCls}>Billing</span>
          <select
            name="billing"
            defaultValue={plan?.billing ?? "monthly"}
            className={inputCls}
            onChange={(e) => {
              if (e.target.value === "bespoke") setBespoke(true);
            }}
          >
            <option value="monthly">Monthly</option>
            <option value="bespoke">Bespoke</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Price (£/month)</span>
          <input
            name="price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={
              plan && plan.pricePence != null ? plan.pricePence / 100 : ""
            }
            disabled={bespoke}
            placeholder={bespoke ? "—" : "2500"}
            className={cn(inputCls, bespoke && "opacity-50")}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelCls}>Sort order</span>
        <input
          name="sortOrder"
          type="number"
          step="1"
          defaultValue={plan?.sortOrder ?? 0}
          className={inputCls}
        />
      </label>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="mostPopular"
            defaultChecked={plan?.mostPopular ?? false}
            className="h-4 w-4 accent-bs-gold"
          />
          <span className="text-sm text-bs-text">Most popular (gold ★ badge)</span>
        </label>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="bespoke"
            checked={bespoke}
            onChange={(e) => setBespoke(e.target.checked)}
            className="h-4 w-4 accent-bs-gold"
          />
          <span className="text-sm text-bs-text">
            Bespoke / Premium (no fixed price)
          </span>
        </label>
      </div>
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
  state: PackagesActionState;
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

function AddPlanDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<PackagesActionState, FormData>(
    createPlanAction,
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
      title="Add package"
      description="Create a new retainer tier for your workspace."
    >
      <form action={action}>
        <PlanFields />
        <DialogFooter
          pending={pending}
          state={state}
          submitLabel="Add package"
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function EditPlanDialog({
  plan,
  onClose,
}: {
  plan: ServicePlanRow | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<PackagesActionState, FormData>(
    updatePlanAction,
    {},
  );
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Dialog
      open={plan != null}
      onClose={onClose}
      title="Edit package"
      description={plan ? `Update the ${plan.name} tier.` : ""}
    >
      {plan ? (
        <form action={action}>
          <input type="hidden" name="id" value={plan.id} />
          {/* key resets inner field state when switching between rows */}
          <PlanFields key={plan.id} plan={plan} />
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

function ArchiveButton({ plan }: { plan: ServicePlanRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${plan.name}`}
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Remove the “${plan.name}” package? It will be archived and hidden from your packages.`,
            )
          ) {
            return;
          }
          const fd = new FormData();
          fd.set("id", plan.id);
          startTransition(async () => {
            const res = await archivePlanAction(fd);
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

export function PackagesEditor({ plans }: { plans: ServicePlanRow[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePlanRow | null>(null);

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-end">
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add package
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border px-4 py-6 text-center text-sm text-bs-subtle">
          No packages yet. Add your first retainer tier.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-bs-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
                <th className="px-4 py-2.5 font-medium">Package</th>
                <th className="px-4 py-2.5 font-medium">Price</th>
                <th className="px-4 py-2.5 font-medium">Billing</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-bs-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-bs-text">{plan.name}</span>
                      <code className="rounded-sm bg-bs-surface-2 px-1.5 py-0.5 text-xs text-bs-muted">
                        {plan.code}
                      </code>
                      {plan.mostPopular ? (
                        <StatusPill tone="gold">★ Popular</StatusPill>
                      ) : null}
                      {plan.bespoke ? (
                        <StatusPill tone="gold">Premium</StatusPill>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-bs-text">{formatPrice(plan)}</td>
                  <td className="px-4 py-3 capitalize text-bs-muted">{plan.billing}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${plan.name}`}
                        onClick={() => setEditing(plan)}
                      >
                        <Pencil className="h-4 w-4 text-bs-muted" />
                      </Button>
                      <ArchiveButton plan={plan} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddPlanDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditPlanDialog plan={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
