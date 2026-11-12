"use client";
import * as React from "react";
import { useActionState } from "react";
import { Plus, X, Star, TriangleAlert } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { cn } from "@/lib/cn";
import {
  assignContentTalentAction,
  assignProjectTalentAction,
  assignShootTalentAction,
  removeCastingAction,
  setRatingAction,
  type CastingActionState,
} from "@/app/(os)/(app)/castings/actions";
import { bookingCostPence } from "@/lib/casting-cost";
import type {
  CastingStatus,
  ContentCasting,
  ProjectCasting,
  ShootCasting,
  TalentPickerOption,
} from "@/lib/data/castings";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const CAST_STATUS: Record<CastingStatus, { label: string; tone: React.ComponentProps<typeof StatusPill>["tone"] }> = {
  pencilled: { label: "Pencilled", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  released: { label: "Released", tone: "neutral" },
};

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";

type Props =
  | { kind: "shoot"; parentId: string; items: ShootCasting[]; talentOptions: TalentPickerOption[] }
  | { kind: "project"; parentId: string; items: ProjectCasting[]; talentOptions: TalentPickerOption[] }
  | { kind: "content"; parentId: string; items: ContentCasting[]; talentOptions: TalentPickerOption[] };

export function CastingSection(props: Props) {
  const { kind, parentId, talentOptions } = props;
  const [open, setOpen] = React.useState(false);
  const count = props.items.length;

  return (
    <div className="border-t border-bs-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-bs-text">
          Talent{count ? ` · ${count}` : ""}
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-bs-subtle transition-colors hover:text-bs-text"
        >
          <Plus className="h-3.5 w-3.5" /> Assign
        </button>
      </div>

      {count === 0 ? (
        <p className="text-xs text-bs-subtle">No talent attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {props.kind === "shoot"
            ? props.items.map((c) => {
                const cost = bookingCostPence({
                  mode: c.rateMode,
                  agreedRatePence: c.agreedRatePence,
                  talentHourlyPence: c.talentRatePence,
                  talentDayPence: c.talentDayRatePence,
                  durationMinutes: c.durationMinutes,
                  dayCount: c.dayCount,
                });
                const days = c.dayCount && c.dayCount > 0 ? c.dayCount : 1;
                const warn = c.unavailableClash
                  ? "Unavailable on this date"
                  : c.dayClash
                    ? "Double-booked this day"
                    : null;
                return (
                  <CastingLine
                    key={c.id}
                    id={c.id}
                    kind="shoot"
                    name={c.talentName}
                    role={c.roleName}
                    warn={warn}
                    meta={[
                      c.callTime ? `call ${timeFmt.format(new Date(c.callTime))}` : null,
                      c.rateMode === "day"
                        ? `day rate${days > 1 ? ` × ${days}` : ""}`
                        : c.durationMinutes != null
                          ? `${c.durationMinutes / 60} hr`
                          : null,
                      cost != null ? `= ${gbp.format(cost / 100)}` : null,
                      c.costOwner === "agency" ? "Blanc Script pays" : "billed to client",
                    ]}
                    pill={CAST_STATUS[c.status]}
                    footer={<RatingControl id={c.id} rating={c.rating} />}
                  />
                );
              })
            : props.kind === "project"
              ? props.items.map((c) => (
                  <CastingLine
                    key={c.id}
                    id={c.id}
                    kind="project"
                    name={c.talentName}
                    role={c.roleName}
                    meta={[rateLabel(c.agreedRatePence, c.talentRatePence)]}
                  />
                ))
              : props.items.map((c) => (
                  <CastingLine
                    key={c.id}
                    id={c.id}
                    kind="content"
                    name={c.talentName}
                    role={c.roleName}
                    meta={[]}
                  />
                ))}
        </ul>
      )}

      {open ? (
        <AssignForm
          kind={kind}
          parentId={parentId}
          talentOptions={talentOptions}
          onDone={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function rateLabel(agreed: number | null, talentRate: number | null): string | null {
  const eff = agreed ?? talentRate;
  if (eff == null) return null;
  return `${gbp.format(eff / 100)}/hr${agreed == null ? " (default)" : ""}`;
}

function CastingLine({
  id,
  kind,
  name,
  role,
  meta,
  pill,
  warn,
  footer,
}: {
  id: string;
  kind: "shoot" | "project" | "content";
  name: string;
  role: string | null;
  meta: (string | null)[];
  pill?: { label: string; tone: React.ComponentProps<typeof StatusPill>["tone"] };
  warn?: string | null;
  footer?: React.ReactNode;
}) {
  const bits = meta.filter(Boolean) as string[];
  return (
    <li className="rounded-sm bg-bs-surface-2 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-bs-text">{name}</span>
            {role ? <span className="text-xs text-bs-muted">{role}</span> : null}
            {pill ? <StatusPill tone={pill.tone}>{pill.label}</StatusPill> : null}
            {warn ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-bs-danger-soft px-2 py-0.5 text-[11px] font-medium text-bs-danger">
                <TriangleAlert className="h-3 w-3" /> {warn}
              </span>
            ) : null}
          </div>
          {bits.length ? (
            <div className="mt-0.5 text-xs text-bs-subtle">{bits.join(" · ")}</div>
          ) : null}
        </div>
        <form action={removeCastingAction}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            aria-label={`Remove ${name}`}
            className="rounded-sm p-1 text-bs-subtle transition-colors hover:bg-bs-surface hover:text-bs-danger"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      {footer ? <div className="mt-1.5">{footer}</div> : null}
    </li>
  );
}

function RatingControl({ id, rating }: { id: string; rating: number | null }) {
  return (
    <form action={setRatingAction} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <span className="text-[11px] text-bs-subtle">Rating</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="submit"
          name="rating"
          value={n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="leading-none"
        >
          <Star
            className={cn(
              "h-3.5 w-3.5 transition-colors",
              rating != null && n <= rating
                ? "fill-bs-gold text-bs-gold"
                : "text-bs-subtle hover:text-bs-gold",
            )}
          />
        </button>
      ))}
      {rating != null ? (
        <button
          type="submit"
          name="rating"
          value=""
          className="ml-1 text-[11px] text-bs-subtle hover:text-bs-text"
        >
          clear
        </button>
      ) : null}
    </form>
  );
}

function AssignForm({
  kind,
  parentId,
  talentOptions,
  onDone,
}: {
  kind: "shoot" | "project" | "content";
  parentId: string;
  talentOptions: TalentPickerOption[];
  onDone: () => void;
}) {
  const action =
    kind === "shoot"
      ? assignShootTalentAction
      : kind === "project"
        ? assignProjectTalentAction
        : assignContentTalentAction;
  const [state, formAction, pending] = useActionState<CastingActionState, FormData>(
    action,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const parentField =
    kind === "shoot" ? "shootId" : kind === "project" ? "projectId" : "contentItemId";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-3 space-y-2 rounded-sm border border-dashed border-bs-border p-3"
    >
      <input type="hidden" name={parentField} value={parentId} />
      {talentOptions.length === 0 ? (
        <p className="text-xs text-bs-subtle">
          No active talent yet — add people in the Talent screen first.
        </p>
      ) : (
        <>
          <select name="talentId" required defaultValue="" className={cn(inputCls, "pr-8")}>
            <option value="" disabled>
              Choose talent…
            </option>
            {talentOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.ratePerHourPence != null
                  ? ` · ${gbp.format(t.ratePerHourPence / 100)}/hr`
                  : ""}
              </option>
            ))}
          </select>
          <input name="roleName" placeholder="Role / character (optional)" className={inputCls} />

          {kind === "shoot" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input type="datetime-local" name="callTime" className={inputCls} aria-label="Call time" />
                <select name="status" defaultValue="pencilled" className={cn(inputCls, "pr-8")}>
                  <option value="pencilled">Pencilled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="released">Released</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select name="rateMode" defaultValue="hourly" className={cn(inputCls, "pr-8")}>
                  <option value="hourly">Charge hourly</option>
                  <option value="day">Charge as day rate</option>
                </select>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  name="hours"
                  placeholder="Hours"
                  className={inputCls}
                  aria-label="Hours worked (hourly mode)"
                />
                <input
                  type="number"
                  step="1"
                  min="1"
                  name="dayCount"
                  placeholder="Days"
                  className={inputCls}
                  aria-label="Number of days (day mode)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="rate"
                  placeholder="Rate £ (optional override)"
                  className={inputCls}
                  aria-label="Rate override"
                />
                <select name="costOwner" defaultValue="client" className={cn(inputCls, "pr-8")}>
                  <option value="client">Billed to client</option>
                  <option value="agency">Blanc Script absorbs</option>
                </select>
              </div>
            </>
          ) : null}

          {kind === "project" ? (
            <input
              type="number"
              step="0.01"
              min="0"
              name="rate"
              placeholder="Rate £/hr (optional — defaults to talent's rate)"
              className={inputCls}
            />
          ) : null}

          {state?.error ? (
            <p className="text-xs text-bs-danger">{state.error}</p>
          ) : null}
          {state?.warning ? (
            <p className="flex items-center gap-1.5 rounded-sm bg-bs-warning-soft px-2 py-1 text-xs text-bs-warning">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {state.warning}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={onDone}
              className="text-xs text-bs-subtle transition-colors hover:text-bs-text"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-bs-text px-3 py-1.5 text-xs font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Assigning…" : "Assign talent"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
