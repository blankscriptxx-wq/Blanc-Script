"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { AiGenerate } from "@/components/ai/ai-generate";
import {
  addProposedTasksAction,
  draftBriefAction,
  proposeTasksAction,
} from "@/app/(os)/(app)/projects/[id]/ai-actions";

/**
 * Client wrappers around the Projects AI actions. "Draft brief" shows the text
 * to copy. "Break into tasks" follows the house rule — AI proposes, you
 * approve: it lists suggested tasks and only adds the ones you tick.
 */

export function DraftBriefButton({ projectId }: { projectId: string }) {
  return (
    <AiGenerate label="Draft brief" action={() => draftBriefAction(projectId)} />
  );
}

export function BreakIntoTasksButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [tasks, setTasks] = React.useState<string[] | null>(null);
  const [picked, setPicked] = React.useState<Set<number>>(new Set());

  async function propose() {
    setPending(true);
    setError("");
    try {
      const res = await proposeTasksAction(projectId);
      if (res.ok) {
        setTasks(res.tasks);
        setPicked(new Set(res.tasks.map((_, i) => i)));
      } else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function add() {
    if (!tasks) return;
    setPending(true);
    setError("");
    try {
      const res = await addProposedTasksAction(
        projectId,
        tasks.filter((_, i) => picked.has(i)),
      );
      if (res.ok) {
        setTasks(null);
        router.refresh();
      } else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  function toggle(i: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {!tasks ? (
        <button
          type="button"
          onClick={propose}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-bs-primary" />
          )}
          {pending ? "Drafting…" : "Break into tasks"}
        </button>
      ) : (
        <div className="w-full min-w-[280px] max-w-md space-y-2 rounded-sm border border-bs-border bg-bs-surface-2 p-3 text-left">
          <p className="text-xs font-medium text-bs-text">
            Suggested tasks — untick any you don&rsquo;t want
          </p>
          <ul className="space-y-1">
            {tasks.map((t, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-bs-text">
                  <input
                    type="checkbox"
                    checked={picked.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-0.5"
                  />
                  <span>{t}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={add}
              disabled={pending || picked.size === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-bs-primary px-3 text-xs font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Add {picked.size} task{picked.size === 1 ? "" : "s"}
            </button>
            <button
              type="button"
              onClick={() => setTasks(null)}
              disabled={pending}
              className="text-xs text-bs-subtle transition-colors hover:text-bs-text"
            >
              Discard
            </button>
          </div>
        </div>
      )}
      {error ? <p className="text-xs text-bs-danger">{error}</p> : null}
    </div>
  );
}
