"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import { saveBriefAction } from "@/app/(os)/(app)/projects/[id]/actions";
import { draftBriefAction } from "@/app/(os)/(app)/projects/[id]/ai-actions";

/**
 * The project brief: read view, with an editor you can type into or fill from
 * an AI draft. The draft only lands in the box — nothing is saved until you
 * press Save (AI proposes, you approve).
 */
export function BriefEditor({ projectId, brief }: { projectId: string; brief: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(brief ?? "");
  const [busy, setBusy] = React.useState<"" | "draft" | "save">("");
  const [error, setError] = React.useState("");

  function start() {
    setValue(brief ?? "");
    setError("");
    setEditing(true);
  }

  async function draft() {
    setBusy("draft");
    setError("");
    try {
      const res = await draftBriefAction(projectId);
      if (res.ok) {
        setValue(res.text);
        setEditing(true);
      } else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setBusy("save");
    setError("");
    try {
      const res = await saveBriefAction(projectId, value);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  const ghostBtn =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-60";

  return (
    <section className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3">Brief</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={draft} disabled={busy !== ""} className={ghostBtn}>
            {busy === "draft" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-bs-primary" />
            )}
            {busy === "draft" ? "Drafting…" : "Draft brief"}
          </button>
          {!editing ? (
            <button type="button" onClick={start} disabled={busy !== ""} className={ghostBtn}>
              <Pencil className="h-3.5 w-3.5" />
              {brief?.trim() ? "Edit brief" : "Write brief"}
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2 rounded-md border border-bs-border bg-bs-surface p-3">
          <textarea
            name="brief"
            aria-label="Project brief"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={12}
            placeholder="Objective, audience, deliverables, tone, key dates…"
            className="w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm leading-relaxed text-bs-text outline-none placeholder:text-bs-subtle"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy !== ""}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-bs-primary px-3 text-xs font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save brief
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={busy !== ""}
              className="text-xs text-bs-subtle transition-colors hover:text-bs-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : brief?.trim() ? (
        <p className="whitespace-pre-wrap rounded-md border border-bs-border bg-bs-surface p-4 text-sm text-bs-muted">
          {brief}
        </p>
      ) : (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
          No brief yet. Write one, or draft it with AI, to give the team the shape of this project.
        </p>
      )}
      {error ? <p className="mt-2 text-xs text-bs-danger">{error}</p> : null}
    </section>
  );
}
