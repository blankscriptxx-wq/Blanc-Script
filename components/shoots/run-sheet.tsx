"use client";

import * as React from "react";
import { Check, ChevronDown, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { setScriptFilmedAction, setShotDoneAction } from "@/app/(os)/(app)/shoots/actions";
import { parseScript } from "@/lib/scripts/breakdown";
import { approveScriptAction } from "@/app/(os)/(app)/shoots/script-actions";
import { AddScript } from "@/components/shoots/add-script";
import { ScriptBreakdown, type SheetOrder, type SheetView } from "@/components/shoots/script-breakdown";
import type { RunSheetScript } from "@/lib/data/shoots";

const STATUS_NOTE: Partial<Record<RunSheetScript["status"], string>> = {
  draft: "Draft — not approved yet",
  review: "In review — not approved yet",
};

const VIEWS: { id: SheetView; label: string; hint: string }[] = [
  { id: "all", label: "Everything", hint: "Lines, shots and notes" },
  { id: "lines", label: "Lines only", hint: "For talent — just what to say" },
  { id: "shots", label: "Shots only", hint: "For camera — framing, action, sound" },
];

/**
 * The scripts to film on a shoot, broken into beats. Staff tick each one off;
 * the shared link shows the same sheet read-only.
 */
export function RunSheet({
  shootId,
  projectId,
  scripts,
  title,
  sharePath,
  canTick = true,
  heading = "Scripts to film",
  selfShoot = false,
}: {
  /** Where new scripts are added: this shoot, or (on a project page) the project. */
  shootId?: string;
  projectId?: string;
  scripts: RunSheetScript[];
  title: string;
  /** Path of the no-login call sheet; shows the Share button when set. */
  sharePath?: string;
  canTick?: boolean;
  heading?: string;
  /** This client films their own content, so new scripts default to the simple style. */
  selfShoot?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<Record<string, RunSheetScript["status"]>>({});
  const statusOf = (s: RunSheetScript) => status[s.id] ?? s.status;
  const approve = async (id: string) => {
    setError("");
    const res = await approveScriptAction(id);
    if (!res.ok) return setError(res.error);
    setStatus((m) => ({ ...m, [id]: "approved" }));
    router.refresh();
  };
  const [filmed, setFilmed] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(scripts.map((s) => [s.id, s.status === "produced"])),
  );
  const [open, setOpen] = React.useState<string | null>(canTick ? null : (scripts[0]?.id ?? null));
  const [view, setView] = React.useState<SheetView>("all");
  const [order, setOrder] = React.useState<SheetOrder>("film");
  // Only scripts written in filming order (a client's own) can be re-sorted.
  const reorderable = React.useMemo(() => scripts.some((s) => parseScript(s.body).some((b) => b.order)), [scripts]);
  const [error, setError] = React.useState("");
  const [shared, setShared] = React.useState("");
  const [shots, setShots] = React.useState<Record<string, number[]>>(() => Object.fromEntries(scripts.map((s) => [s.id, s.shotsDone ?? []])));
  const shotsOf = (s: RunSheetScript) => shots[s.id] ?? s.shotsDone ?? [];
  const done = scripts.filter((s) => filmed[s.id]).length;

  const tickShot = async (s: RunSheetScript, index: number, on: boolean) => {
    const before = shotsOf(s);
    setError("");
    setShots((m) => ({ ...m, [s.id]: on ? [...new Set([...before, index])] : before.filter((n) => n !== index) }));
    const res = await setShotDoneAction(s.id, index, on);
    if (!res.ok) {
      setShots((m) => ({ ...m, [s.id]: before }));
      return setError(res.error);
    }
    setShots((m) => ({ ...m, [s.id]: res.shotsDone }));
    setFilmed((f) => ({ ...f, [s.id]: res.filmed }));
  };

  const toggle = async (id: string) => {
    const next = !filmed[id];
    setError("");
    setFilmed((f) => ({ ...f, [id]: next }));
    const target = scripts.find((x) => x.id === id);
    if (target) setShots((m) => ({ ...m, [id]: next ? parseScript(target.body).map((_, i) => i) : [] }));
    const res = await setScriptFilmedAction(id, next);
    if (!res.ok) {
      setFilmed((f) => ({ ...f, [id]: !next }));
      setError(res.error);
    }
  };

  const share = async () => {
    if (!sharePath) return;
    const url = window.location.origin + sharePath;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Call sheet and scripts: ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("Link copied — paste it into WhatsApp or a message.");
    } catch {
      // Sharing was cancelled, or the clipboard is blocked: show the link instead.
      setShared(url);
    }
  };

  const goTo = (id: string) => {
    setOpen(id);
    setTimeout(() => document.getElementById(`script-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-h2 text-bs-text">{heading}</h2>
        {scripts.length ? (
          <span className="shrink-0 text-sm tabular-nums text-bs-muted">
            {done} of {scripts.length} filmed
          </span>
        ) : null}
      </div>
      {scripts.length ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bs-surface-2">
          <div className="h-full rounded-full bg-bs-success transition-all" style={{ width: `${(done / scripts.length) * 100}%` }} />
        </div>
      ) : null}

      {sharePath && scripts.length ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={share}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover sm:w-auto"
          >
            <Share2 className="h-4 w-4" /> Share with talent and crew
          </button>
          <p className="mt-1.5 break-all text-xs text-bs-muted">
            {shared || "Sends a link they can open on their phone — no login, and no prices."}
          </p>
        </div>
      ) : null}

      {scripts.length ? (
        <div className="sticky top-0 z-10 -mx-1 mt-4 bg-bs-canvas px-1 py-2">
          <div role="tablist" aria-label="What to show" className="grid grid-cols-3 gap-1 rounded-md border border-bs-border bg-bs-surface p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                title={v.hint}
                onClick={() => setView(v.id)}
                className={
                  "h-10 rounded-sm text-sm font-medium transition-colors " +
                  (view === v.id ? "bg-bs-text text-bs-surface" : "text-bs-muted hover:bg-bs-surface-2")
                }
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {reorderable ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-bs-muted">Client&apos;s own scripts:</span>
          {(
            [
              ["film", "Filming order"],
              ["edit", "Finished video order"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={order === id}
              onClick={() => setOrder(id)}
              className={
                "h-8 rounded-pill border px-3 text-xs font-medium transition-colors " +
                (order === id ? "border-bs-text bg-bs-text text-bs-surface" : "border-bs-border-strong text-bs-text hover:bg-bs-surface-2")
              }
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-bs-danger">{error}</p> : null}

      {scripts.length === 0 ? (
        <p className="mt-4 rounded-md border border-bs-border bg-bs-surface p-4 text-sm text-bs-muted">
          {canTick ? "No scripts here yet. Add the first one below." : "The scripts for this shoot haven't been added yet."}
        </p>
      ) : (
        <ol className="mt-2 space-y-2">
          {scripts.map((s, i) => {
            const isOpen = open === s.id;
            const isDone = filmed[s.id];
            const next = scripts[i + 1];
            const st = statusOf(s);
            const pending = !isDone && (st === "draft" || st === "review" || st === "idea");
            return (
              <li key={s.id} id={`script-${s.id}`} className="scroll-mt-16 overflow-hidden rounded-md border border-bs-border bg-bs-surface">
                <div className="flex items-stretch">
                  {canTick ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`Mark "${s.title}" as filmed`}
                      onClick={() => toggle(s.id)}
                      className="grid w-14 shrink-0 place-items-center border-r border-bs-border transition-colors hover:bg-bs-surface-2"
                    >
                      <span
                        className={
                          "grid h-7 w-7 place-items-center rounded-full border-2 transition-colors " +
                          (isDone ? "border-bs-success bg-bs-success text-white" : "border-bs-border-strong text-transparent")
                        }
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </button>
                  ) : (
                    <span className="grid w-12 shrink-0 place-items-center border-r border-bs-border">
                      <span
                        className={
                          "grid h-7 w-7 place-items-center rounded-full text-sm font-semibold " +
                          (isDone ? "bg-bs-success text-white" : "bg-bs-surface-2 text-bs-text")
                        }
                      >
                        {isDone ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => (isOpen ? setOpen(null) : goTo(s.id))}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bs-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={"block break-words font-medium " + (isDone ? "text-bs-muted line-through" : "text-bs-text")}>
                        {s.title}
                      </span>
                      <span className="block text-xs text-bs-subtle">
                        {s.style === "self" ? "Client films this · " : ""}
                        {isDone
                          ? "Filmed"
                          : STATUS_NOTE[st] ??
                            (shotsOf(s).length ? `${shotsOf(s).length} of ${parseScript(s.body).length} shots filmed` : "Ready to film")}
                      </span>
                    </span>
                    <ChevronDown className={"h-4 w-4 shrink-0 text-bs-subtle transition-transform " + (isOpen ? "rotate-180" : "")} />
                  </button>
                </div>
                {isOpen ? (
                  <div className="border-t border-bs-border px-4 py-4">
                    <ScriptBreakdown script={s} view={view} order={order} done={shotsOf(s)} onTick={canTick ? (i, on) => void tickShot(s, i, on) : undefined} />
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-bs-border pt-4">
                      {canTick && pending ? (
                        <button
                          type="button"
                          onClick={() => approve(s.id)}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover"
                        >
                          <Check className="h-4 w-4" /> Approve script
                        </button>
                      ) : canTick ? (
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          className={
                            "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors " +
                            (isDone
                              ? "border border-bs-border-strong text-bs-text hover:bg-bs-surface-2"
                              : "bg-bs-success text-white hover:opacity-90")
                          }
                        >
                          <Check className="h-4 w-4" /> {isDone ? "Filmed — undo" : "Mark as filmed"}
                        </button>
                      ) : null}
                      {next ? (
                        <button
                          type="button"
                          onClick={() => goTo(next.id)}
                          className="inline-flex h-11 flex-1 items-center justify-center rounded-sm border border-bs-border-strong px-4 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2"
                        >
                          Next script →
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {canTick && (shootId || projectId) ? <AddScript shootId={shootId} projectId={projectId} selfShoot={selfShoot} /> : null}
    </section>
  );
}
