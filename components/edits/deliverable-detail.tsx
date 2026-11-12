"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Film, MessageSquare, Plus } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import {
  addVersionAction,
  postCommentAction,
  setStatusAction,
  type DetailActionState,
} from "@/app/(app)/edits/[id]/actions";
import type { DeliverableStatus } from "@/lib/data/edits";
import type {
  DeliverableDetail,
  DeliverableVersionRow,
  ReviewCommentRow,
} from "@/lib/data/deliverable-detail";
import { cn } from "@/lib/cn";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const STATUS_TONE: Record<DeliverableStatus, Tone> = {
  editing: "neutral",
  in_review: "info",
  changes_requested: "warning",
  approved: "success",
  published: "accent",
};

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  editing: "Editing",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
};

const WORKFLOW: DeliverableStatus[] = [
  "editing",
  "in_review",
  "changes_requested",
  "approved",
  "published",
];

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";

export function DeliverableDetailView({ detail }: { detail: DeliverableDetail }) {
  const { deliverable: d, versions, comments } = detail;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/edits"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Edits
      </Link>

      {/* Header */}
      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-bs-text">{d.title}</h1>
          <StatusPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusPill>
          {d.versionLabel ? (
            <StatusPill tone="gold">{d.versionLabel}</StatusPill>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-bs-muted">
          {d.projectName || d.clientName ? (
            <span>{[d.projectName, d.clientName].filter(Boolean).join(" · ")}</span>
          ) : (
            <span className="text-bs-subtle">No project or client attached</span>
          )}
          {d.dueAt ? (
            <span className="text-bs-subtle">· Due {dateFmt.format(new Date(d.dueAt))}</span>
          ) : null}
        </div>
        {d.previewUrl ? (
          <a
            href={d.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-bs-border bg-bs-surface-2 px-3 py-1.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface"
          >
            Open preview <ExternalLink className="h-3.5 w-3.5 text-bs-subtle" />
          </a>
        ) : null}
        {d.notes?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap border-t border-bs-border pt-3 text-sm text-bs-muted">
            {d.notes}
          </p>
        ) : null}
      </div>

      {/* Status workflow */}
      <StatusWorkflow deliverableId={d.id} current={d.status} />

      {/* Versions */}
      <VersionsSection deliverableId={d.id} versions={versions} />

      {/* Review comments */}
      <CommentsSection deliverableId={d.id} comments={comments} />
    </div>
  );
}

function StatusWorkflow({
  deliverableId,
  current,
}: {
  deliverableId: string;
  current: DeliverableStatus;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-h3">Review status</h2>
      <div className="flex flex-wrap gap-2 rounded-md border border-bs-border bg-bs-surface p-3">
        {WORKFLOW.map((status) => {
          const active = status === current;
          if (active) {
            return (
              <span
                key={status}
                aria-current="true"
                className="inline-flex items-center rounded-sm border border-bs-border-strong bg-bs-surface-2 px-3 py-1.5 text-sm font-medium text-bs-text"
              >
                {STATUS_LABEL[status]}
              </span>
            );
          }
          return (
            <form key={status} action={setStatusAction}>
              <input type="hidden" name="deliverableId" value={deliverableId} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className="inline-flex items-center rounded-sm border border-bs-border bg-bs-surface px-3 py-1.5 text-sm text-bs-muted transition-colors hover:bg-bs-surface-2 hover:text-bs-text"
              >
                {STATUS_LABEL[status]}
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

function VersionsSection({
  deliverableId,
  versions,
}: {
  deliverableId: string;
  versions: DeliverableVersionRow[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<DetailActionState, FormData>(
    addVersionAction,
    null,
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
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">
            Versions{versions.length ? ` · ${versions.length}` : ""}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-bs-subtle transition-colors hover:text-bs-text"
        >
          <Plus className="h-3.5 w-3.5" /> Add version
        </button>
      </div>

      {open ? (
        <form
          ref={formRef}
          action={formAction}
          className="mb-3 space-y-2 rounded-md border border-dashed border-bs-border bg-bs-surface p-3"
        >
          <input type="hidden" name="deliverableId" value={deliverableId} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              name="label"
              required
              autoFocus
              placeholder="Version label (e.g. v2)"
              className={inputCls}
              aria-label="Version label"
            />
            <input
              name="previewUrl"
              type="url"
              placeholder="Preview URL (optional)"
              className={inputCls}
              aria-label="Preview URL"
            />
          </div>
          <input
            name="note"
            placeholder="What changed in this cut? (optional)"
            className={inputCls}
            aria-label="Version note"
          />
          {state && !state.ok ? (
            <p className="text-xs text-bs-danger">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-0.5">
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
              {pending ? "Adding…" : "Add version"}
            </button>
          </div>
        </form>
      ) : null}

      {versions.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
          No versions logged yet. Add a cut to start the version history.
        </p>
      ) : (
        <ol className="space-y-2">
          {versions.map((v) => (
            <li
              key={v.id}
              className="rounded-md border border-bs-border bg-bs-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusPill tone="gold">{v.label}</StatusPill>
                  <span className="text-xs text-bs-subtle">
                    {dateTimeFmt.format(new Date(v.createdAt))}
                  </span>
                </div>
                {v.previewUrl ? (
                  <a
                    href={v.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-bs-primary underline-offset-4 hover:underline"
                  >
                    Preview <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              {v.note?.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-bs-muted">{v.note}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentsSection({
  deliverableId,
  comments,
}: {
  deliverableId: string;
  comments: ReviewCommentRow[];
}) {
  const [state, formAction, pending] = useActionState<DetailActionState, FormData>(
    postCommentAction,
    null,
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-bs-subtle" />
        <h2 className="font-display text-h3">
          Review comments{comments.length ? ` · ${comments.length}` : ""}
        </h2>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mb-4 space-y-2 rounded-md border border-bs-border bg-bs-surface p-3"
      >
        <input type="hidden" name="deliverableId" value={deliverableId} />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Leave a review note…"
          className="w-full resize-y rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
          aria-label="Review comment"
        />
        {state && !state.ok ? (
          <p className="text-xs text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-bs-text px-3 py-1.5 text-xs font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
          No review comments yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-bs-border bg-bs-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-bs-text">
                  {c.authorName ?? "Unknown"}
                </span>
                <span className="text-xs text-bs-subtle">
                  {dateTimeFmt.format(new Date(c.createdAt))}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-bs-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
