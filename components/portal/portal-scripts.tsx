"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { portalTickShotAction } from "@/app/(os)/portal/[token]/actions";
import { ScriptBreakdown } from "@/components/shoots/script-breakdown";
import { UploadPanel } from "@/components/portal/upload-panel";
import { parseScript } from "@/lib/scripts/breakdown";
import type { PortalScript } from "@/lib/data/portal";

/** The client's own scripts: one shot at a time, ticked off as they film. */
export function PortalScripts({ token, scripts }: { token: string; scripts: PortalScript[] }) {
  const [shots, setShots] = React.useState<Record<string, number[]>>(() => Object.fromEntries(scripts.map((s) => [s.id, s.shotsDone])));
  const [open, setOpen] = React.useState<string | null>(scripts.find((s) => s.status !== "produced")?.id ?? null);
  const [error, setError] = React.useState("");

  const tick = async (id: string, index: number, on: boolean) => {
    const before = shots[id] ?? [];
    setError("");
    setShots((m) => ({ ...m, [id]: on ? [...new Set([...before, index])] : before.filter((n) => n !== index) }));
    const res = await portalTickShotAction(token, id, index, on);
    if (!res.ok) {
      setShots((m) => ({ ...m, [id]: before }));
      return setError(res.error);
    }
    setShots((m) => ({ ...m, [id]: res.shotsDone }));
  };

  return (
    <div>
      <p className="mb-3 text-sm text-bs-muted">
        Film these yourself, one shot at a time. Tick each shot as you get it, then send us the clips from inside the script. We start editing as soon as they arrive.
      </p>
      {error ? <p className="mb-2 text-sm text-bs-danger">{error}</p> : null}
      <ol className="space-y-2">
        {scripts.map((s) => {
          const total = parseScript(s.body).length;
          const got = (shots[s.id] ?? []).length;
          const all = total > 0 && got >= total;
          const sent = s.status === "produced";
          const isOpen = open === s.id;
          return (
            <li key={s.id} className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bs-surface-2"
              >
                <span
                  className={
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold " +
                    (all ? "bg-bs-success text-white" : "bg-bs-surface-2 text-bs-text")
                  }
                >
                  {all ? <Check className="h-4 w-4" /> : `${got}/${total}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-medium text-bs-text">{s.title}</span>
                  <span className="block text-xs text-bs-subtle">
                    {sent ? "Clips received — we’re editing" : all ? "All shots filmed — now send us the clips" : got ? `${total - got} ${total - got === 1 ? "shot" : "shots"} to go` : `${total} shots`}
                  </span>
                </span>
                <ChevronDown className={"h-4 w-4 shrink-0 text-bs-subtle transition-transform " + (isOpen ? "rotate-180" : "")} />
              </button>
              {isOpen ? (
                <div className="border-t border-bs-border px-4 py-4">
                  <ScriptBreakdown script={s} view="all" done={shots[s.id] ?? []} onTick={sent ? undefined : (i, on) => void tick(s.id, i, on)} />
                  <div className="mt-5 border-t border-bs-border pt-4">
                    <p className="mb-2 text-sm font-medium text-bs-text">{sent ? "Send more clips for this video" : "Send us the clips for this video"}</p>
                    <UploadPanel token={token} scriptId={s.id} intro="Add every clip you filmed for this video. The order doesn’t matter." />
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
