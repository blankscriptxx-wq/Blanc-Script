"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus, Sparkles } from "lucide-react";
import { addScriptAction, generateScriptsAction } from "@/app/(os)/(app)/shoots/script-actions";

const field =
  "w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-body text-bs-text outline-none placeholder:text-bs-subtle focus:border-bs-primary";

/** Add scripts to a shoot or project: draft them with AI, or write one yourself. */
export function AddScript({ shootId, projectId, selfShoot = false }: { shootId?: string; projectId?: string; selfShoot?: boolean }) {
  const [style, setStyle] = React.useState<"crew" | "self">(selfShoot ? "self" : "crew");
  const router = useRouter();
  const home = { shootId: shootId ?? null, projectId: projectId ?? null };
  const [mode, setMode] = React.useState<"" | "ai" | "write">("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [count, setCount] = React.useState(1);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const run = async (fn: () => Promise<{ ok: boolean; error: string }>) => {
    setBusy(true);
    setError("");
    const res = await fn().catch(() => ({ ok: false, error: "That took too long. Try again, or ask for fewer scripts at once." }));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMode("");
    setBrief("");
    setTitle("");
    setBody("");
    router.refresh();
  };

  const tab = (id: "ai" | "write", label: string, Icon: typeof Plus) => (
    <button
      type="button"
      onClick={() => setMode(mode === id ? "" : id)}
      aria-pressed={mode === id}
      className={
        "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-sm border px-3 text-sm font-medium transition-colors sm:flex-none " +
        (mode === id ? "border-bs-text bg-bs-text text-bs-surface" : "border-bs-border-strong text-bs-text hover:bg-bs-surface-2")
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="mt-4 rounded-md border border-dashed border-bs-border-strong p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-bs-text">
          <Plus className="h-4 w-4" /> Add a script
        </span>
        {tab("ai", "Draft with AI", Sparkles)}
        {tab("write", "Write it yourself", PenLine)}
      </div>

      {mode ? (
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-bs-muted">
          Who films it
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value === "self" ? "self" : "crew")}
            className="h-10 min-w-0 flex-1 rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-sm text-bs-text sm:flex-none"
          >
            <option value="crew">Our team — full camera direction</option>
            <option value="self">The client, themselves — simple shot list</option>
          </select>
        </label>
      ) : null}

      {mode === "ai" ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="What should it be about? e.g. 30-second promo on why clients book us, filmed in the studio, confident tone."
            className={field}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-bs-muted">
              How many
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-10 rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-sm text-bs-text">
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => generateScriptsAction(home, brief, count, style))}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent hover:bg-bs-primary-hover disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" /> {busy ? "Writing…" : "Draft"}
            </button>
          </div>
          <p className="text-xs text-bs-muted">Drafts use what the studio knows about this client. They arrive as drafts for you to read and approve.</p>
        </div>
      ) : null}

      {mode === "write" ? (
        <div className="mt-3 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Script title" className={field + " h-10"} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            placeholder={style === "self" ? "Shot 1 · Face the camera\nSet-up: Prop your phone at eye level, straight in front of you.\nSAY: “Three mistakes I see every week.”\n\nShot 2 · Walk towards the camera\nSet-up: Phone to one side, pointing along the path.\nDo: Walk towards it as you talk.\nSAY: “Here’s the first.”" : "0–5s · HOOK\nCamera: Locked off, static.\nVisual: Empty studio, one chair.\nSAY: “Posting every day...”\n\n5–12s · WHO WE ARE\nCamera: Gimbal, fast orbit.\nSAY: “That’s where we come in.”"}
            className={field + " font-mono text-sm"}
          />
          <div className="flex items-center gap-2">
            <p className="mr-auto text-xs text-bs-muted">
              {style === "self"
                ? "Start each shot with “Shot 1 · name”, then lines beginning Set-up:, Do: or SAY: — they’re laid out automatically."
                : "Start each part with a time and name, then lines beginning Camera:, Visual:, Sound:, SAY: or Cut: — they’re laid out automatically."}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => addScriptAction(home, { title, body, style }))}
              className="inline-flex h-10 shrink-0 items-center rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent hover:bg-bs-primary-hover disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-bs-danger">{error}</p> : null}
    </div>
  );
}
