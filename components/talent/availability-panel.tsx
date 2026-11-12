"use client";
import * as React from "react";
import { useActionState } from "react";
import { Plus, X } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { cn } from "@/lib/cn";
import {
  addAvailabilityAction,
  removeAvailabilityAction,
  type AvailabilityActionState,
} from "@/app/(os)/(app)/talent/[id]/actions";
import type { AvailabilityRow } from "@/lib/data/talent";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";

function range(a: Date, b: Date): string {
  const s = dateFmt.format(new Date(a));
  const e = dateFmt.format(new Date(b));
  return s === e ? s : `${s} – ${e}`;
}

export function AvailabilityPanel({
  talentId,
  rows,
}: {
  talentId: string;
  rows: AvailabilityRow[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<AvailabilityActionState, FormData>(
    addAvailabilityAction,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-h3">Availability</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-bs-subtle transition-colors hover:text-bs-text"
        >
          <Plus className="h-3.5 w-3.5" /> Add window
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
          No availability windows noted. Add holidays, away dates or confirmed free periods.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-2.5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={r.kind === "unavailable" ? "danger" : "success"}>
                    {r.kind === "unavailable" ? "Unavailable" : "Available"}
                  </StatusPill>
                  <span className="text-sm text-bs-text tabular-nums">
                    {range(r.startDate, r.endDate)}
                  </span>
                </div>
                {r.note ? <div className="mt-0.5 text-xs text-bs-subtle">{r.note}</div> : null}
              </div>
              <form action={removeAvailabilityAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="talentId" value={talentId} />
                <button
                  type="submit"
                  aria-label="Remove window"
                  className="rounded-sm p-1 text-bs-subtle transition-colors hover:bg-bs-surface-2 hover:text-bs-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form
          ref={formRef}
          action={action}
          className="mt-3 space-y-2 rounded-md border border-dashed border-bs-border p-3"
        >
          <input type="hidden" name="talentId" value={talentId} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select name="kind" defaultValue="unavailable" className={cn(inputCls, "pr-8")}>
              <option value="unavailable">Unavailable</option>
              <option value="available">Available</option>
            </select>
            <input type="date" name="startDate" required className={inputCls} aria-label="Start date" />
            <input type="date" name="endDate" required className={inputCls} aria-label="End date" />
            <input name="note" placeholder="Note (optional)" className={inputCls} />
          </div>
          {state?.error ? <p className="text-xs text-bs-danger">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-bs-subtle transition-colors hover:text-bs-text"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-bs-text px-3 py-1.5 text-xs font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save window"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
