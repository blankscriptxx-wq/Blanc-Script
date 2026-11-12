"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageSquare, PenLine } from "lucide-react";
import {
  portalCommentAction,
  portalDecisionAction,
  type PortalResult,
} from "@/app/(os)/portal/[token]/actions";

/** The client's side of a review: leave a note, approve, or ask for changes. */
export function ReviewPanel({
  token,
  deliverableId,
  canDecide,
  status,
}: {
  token: string;
  deliverableId: string;
  canDecide: boolean;
  status: string;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [time, setTime] = React.useState("");
  const [busy, setBusy] = React.useState<"" | "comment" | "approved" | "changes_requested">("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  function seconds(): number | null {
    const t = time.trim();
    if (!t) return null;
    const m = /^(\d{1,3}):([0-5]?\d)$/.exec(t);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    return /^\d{1,5}$/.test(t) ? Number(t) : null;
  }

  async function run(kind: "comment" | "approved" | "changes_requested") {
    setBusy(kind);
    setNote(null);
    let res: PortalResult | null = null;
    try {
      res =
        kind === "comment"
          ? await portalCommentAction(token, deliverableId, body, seconds())
          : await portalDecisionAction(token, deliverableId, kind, body);
    } catch {
      res = { ok: false, error: "Something went wrong. Please try again." };
    }
    setBusy("");
    setNote(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    if (res.ok) {
      setBody("");
      setTime("");
      router.refresh();
    }
  }

  const disabled = busy !== "";

  return (
    <section className="mt-4 rounded-md border border-bs-border bg-bs-surface p-5">
      <h2 className="flex items-center gap-2 font-display text-h3">
        <MessageSquare className="h-4 w-4 text-bs-muted" /> Your feedback
      </h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        aria-label="Your feedback"
        placeholder="What do you think? Mention anything you'd like changed."
        className="mt-3 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm leading-relaxed text-bs-text outline-none placeholder:text-bs-subtle"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-bs-muted">
          At (optional)
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="0:42"
            inputMode="numeric"
            aria-label="Timecode"
            className="h-8 w-20 rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
          />
        </label>
        <button
          type="button"
          disabled={disabled || !body.trim()}
          onClick={() => run("comment")}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong px-3 text-sm text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
        >
          {busy === "comment" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send comment
        </button>
      </div>

      {canDecide ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-bs-border pt-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => run("approved")}
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-bs-success px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy === "approved" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve this cut
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => run("changes_requested")}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-bs-border-strong px-4 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
          >
            {busy === "changes_requested" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PenLine className="h-4 w-4" />
            )}
            Request changes
          </button>
          <span className="text-xs text-bs-subtle">
            {status === "changes_requested"
              ? "You've asked for changes. You can still approve if you're happy."
              : "Anything written above is sent with your decision."}
          </span>
        </div>
      ) : null}

      {note ? (
        <p className={`mt-3 text-sm ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
      ) : null}
    </section>
  );
}
