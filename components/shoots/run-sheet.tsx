"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { setScriptFilmedAction } from "@/app/(os)/(app)/shoots/actions";
import type { RunSheetScript } from "@/lib/data/shoots";

const STATUS_NOTE: Partial<Record<RunSheetScript["status"], string>> = {
  draft: "Draft — not approved yet",
  review: "In review — not approved yet",
};

/** The scripts to film on a shoot: open each in full, tick it off when filmed. */
export function RunSheet({
  shootId,
  clientId,
  scripts,
}: {
  shootId: string;
  clientId: string | null;
  scripts: RunSheetScript[];
}) {
  const [filmed, setFilmed] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(scripts.map((s) => [s.id, s.status === "produced"])),
  );
  const [open, setOpen] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const done = scripts.filter((s) => filmed[s.id]).length;

  const toggle = async (id: string) => {
    const next = !filmed[id];
    setError("");
    setFilmed((f) => ({ ...f, [id]: next }));
    const res = await setScriptFilmedAction(shootId, id, next);
    if (!res.ok) {
      setFilmed((f) => ({ ...f, [id]: !next }));
      setError(res.error);
    }
  };

  const part = (label: string, text: string | null) =>
    text?.trim() ? (
      <div>
        <p className="text-eyebrow uppercase text-bs-subtle">{label}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-body leading-relaxed text-bs-text">{text.trim()}</p>
      </div>
    ) : null;

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-h2 text-bs-text">Scripts to film</h2>
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
      {error ? <p className="mt-3 text-sm text-bs-danger">{error}</p> : null}

      {scripts.length === 0 ? (
        <p className="mt-4 rounded-md border border-bs-border bg-bs-surface p-4 text-sm text-bs-muted">
          {clientId ? (
            <>
              No scripts for this client yet.{" "}
              <Link href={`/clients/${clientId}/strategy`} className="font-medium text-bs-text underline">
                Write them in the script studio
              </Link>
              .
            </>
          ) : (
            "Link this shoot to a client to see their scripts here."
          )}
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {scripts.map((s, i) => {
            const isOpen = open === s.id;
            const isDone = filmed[s.id];
            return (
              <li key={s.id} className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
                <div className="flex items-stretch">
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
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bs-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={"block break-words font-medium " + (isDone ? "text-bs-muted line-through" : "text-bs-text")}>
                        {/^script\s*\d+/i.test(s.title) ? s.title : `${i + 1}. ${s.title}`}
                      </span>
                      <span className="block text-xs text-bs-subtle">
                        {isDone ? "Filmed" : STATUS_NOTE[s.status] ?? "Ready to film"}
                      </span>
                    </span>
                    <ChevronDown className={"h-4 w-4 shrink-0 text-bs-subtle transition-transform " + (isOpen ? "rotate-180" : "")} />
                  </button>
                </div>
                {isOpen ? (
                  <div className="space-y-4 border-t border-bs-border px-4 py-4">
                    {part("Opening shot", s.hookVisual)}
                    {part("Opening line", s.hookScript)}
                    {part("Script", s.body)}
                    {part("Notes", s.notes)}
                    {!s.hookVisual && !s.hookScript && !s.body && !s.notes ? (
                      <p className="text-sm text-bs-muted">This script has no text yet.</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
