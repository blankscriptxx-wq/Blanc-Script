"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Film,
  Clapperboard,
  MessageSquare,
  Plus,
  Pencil,
  Archive,
  CornerDownRight,
  User,
  Clock,
  VideoOff,
} from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { Button } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import {
  addVersionAction,
  postCommentAction,
  setStatusAction,
  updateDeliverableAction,
  archiveDeliverableAction,
  resolveCommentAction,
  type DetailActionState,
} from "@/app/(os)/(app)/edits/[id]/actions";
import type { DeliverableStatus } from "@/lib/data/edits";
import type {
  DeliverableDetail,
  DeliverableDetailHeader,
  DeliverableVersionRow,
  ReviewCommentRow,
} from "@/lib/data/deliverable-detail";
import type { MediaAssetRow } from "@/lib/data/media";
import { AiGenerate } from "@/components/ai/ai-generate";
import {
  summariseCommentsAction,
  draftClientUpdateAction,
} from "@/app/(os)/(app)/edits/[id]/ai-actions";
import { cn } from "@/lib/cn";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];
type Option = { id: string; name: string };
type ShootOption = { id: string; title: string };
type ReviewerOption = { id: string; name: string | null };

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
const dateInputFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

/** Date → yyyy-mm-dd for a native date input. */
function toDateInput(d: Date | null | undefined): string {
  return d ? dateInputFmt.format(new Date(d)) : "";
}

/** Seconds → m:ss timecode. */
function formatTimecode(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

/** Does this URL look like a directly playable video file? */
function looksLikeVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return VIDEO_EXT.test(url.trim());
}

/**
 * Resolve a playable video source for inline review: prefer the first attached
 * video asset (served via /uploads/<id>), else fall back to the header's
 * previewUrl when it points at a video file.
 */
function resolveVideoSource(
  media: MediaAssetRow[] | undefined,
  previewUrl: string | null,
): string | null {
  const asset = media?.find((m) => m.kind === "video");
  if (asset) return `/uploads/${asset.id}`;
  if (looksLikeVideoUrl(previewUrl)) return previewUrl;
  return null;
}

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";

export function DeliverableDetailView({
  detail,
  projectOptions,
  clientOptions,
  shootOptions,
  reviewerOptions,
  media,
  storageReady,
}: {
  detail: DeliverableDetail;
  projectOptions: Option[];
  clientOptions: Option[];
  shootOptions: ShootOption[];
  reviewerOptions: ReviewerOption[];
  media?: MediaAssetRow[];
  storageReady?: boolean;
}) {
  const { deliverable: d, versions, comments } = detail;
  const [editOpen, setEditOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const videoSrc = resolveVideoSource(media, d.previewUrl);

  /** Seek the review player to a comment's timecode and start playback. */
  const seekTo = React.useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, seconds);
    void v.play().catch(() => {
      /* autoplay can be blocked — seeking alone is enough */
    });
  }, []);

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-h1 text-bs-text">{d.title}</h1>
            <StatusPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusPill>
            {d.versionLabel ? (
              <StatusPill tone="gold">{d.versionLabel}</StatusPill>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-bs-border bg-bs-surface px-3 py-1.5 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2"
            >
              <Pencil className="h-3.5 w-3.5 text-bs-subtle" /> Edit
            </button>
            <ArchiveButton deliverableId={d.id} />
          </div>
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

        {/* Reviewer + linked shoot */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-bs-border pt-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-bs-muted">
            <User className="h-4 w-4 text-bs-subtle" />
            {d.reviewerUserId ? (
              <>
                <span className="text-bs-subtle">Reviewer</span>
                <span className="text-bs-text">{d.reviewerName ?? "Unnamed"}</span>
                {d.reviewDueAt ? (
                  <span className="text-bs-subtle">
                    · by {dateFmt.format(new Date(d.reviewDueAt))}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-bs-subtle">No reviewer assigned</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-bs-muted">
            <Clapperboard className="h-4 w-4 text-bs-subtle" />
            {d.shootId ? (
              <>
                <span className="text-bs-subtle">Shoot</span>
                <span className="text-bs-text">{d.shootTitle ?? "Linked shoot"}</span>
              </>
            ) : (
              <span className="text-bs-subtle">No shoot linked</span>
            )}
          </span>
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

        <div className="mt-3 border-t border-bs-border pt-3">
          <AiGenerate
            label="Draft client update"
            action={() => draftClientUpdateAction(d.id)}
          />
        </div>
      </div>

      {/* Inline video review */}
      <VideoReview
        videoRef={videoRef}
        videoSrc={videoSrc}
        previewUrl={d.previewUrl}
        storageReady={storageReady}
      />

      {/* Status workflow */}
      <StatusWorkflow deliverableId={d.id} current={d.status} />

      {/* Versions */}
      <VersionsSection deliverableId={d.id} versions={versions} />

      {/* Review comments */}
      <CommentsSection
        deliverableId={d.id}
        comments={comments}
        videoRef={videoRef}
        hasVideo={Boolean(videoSrc)}
        onSeek={seekTo}
      />

      <EditDeliverableDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        deliverable={d}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
        shootOptions={shootOptions}
        reviewerOptions={reviewerOptions}
      />
    </div>
  );
}

function VideoReview({
  videoRef,
  videoSrc,
  previewUrl,
  storageReady,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string | null;
  previewUrl: string | null;
  storageReady?: boolean;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <Film className="h-4 w-4 text-bs-subtle" />
        <h2 className="font-display text-h3">Review player</h2>
      </div>

      {videoSrc ? (
        <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface-2">
          <video
            ref={videoRef}
            controls
            preload="metadata"
            playsInline
            src={videoSrc}
            className="aspect-video w-full bg-black"
          >
            Your browser doesn’t support embedded video. Use the preview link
            instead.
          </video>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
          <div className="flex items-center gap-2 text-bs-muted">
            <VideoOff className="h-4 w-4 text-bs-subtle" />
            <span>No video attached to review inline.</span>
          </div>
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-bs-primary underline-offset-4 hover:underline"
            >
              Open preview <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {storageReady ? (
            <p className="mt-2 text-xs text-bs-subtle">
              Attach a video file from the Shoot or Files areas and it will play
              here for timecoded review.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ArchiveButton({ deliverableId }: { deliverableId: string }) {
  return (
    <form
      action={archiveDeliverableAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Archive this deliverable? It will be removed from the queue.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={deliverableId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-sm border border-bs-border bg-bs-surface px-3 py-1.5 text-sm font-medium text-bs-danger transition-colors hover:bg-bs-surface-2"
      >
        <Archive className="h-3.5 w-3.5" /> Archive
      </button>
    </form>
  );
}

function EditDeliverableDialog({
  open,
  onClose,
  deliverable: d,
  projectOptions,
  clientOptions,
  shootOptions,
  reviewerOptions,
}: {
  open: boolean;
  onClose: () => void;
  deliverable: DeliverableDetailHeader;
  projectOptions: Option[];
  clientOptions: Option[];
  shootOptions: ShootOption[];
  reviewerOptions: ReviewerOption[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DetailActionState, FormData>(
    updateDeliverableAction,
    null,
  );
  React.useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onClose={onClose} title="Edit deliverable">
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={d.id} />
        <Field label="Title">
          <input
            name="title"
            required
            defaultValue={d.title}
            className={inputCls}
            placeholder="Deliverable title"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project">
            <select
              name="projectId"
              defaultValue={d.projectId ?? ""}
              className={cn(inputCls, "pr-8")}
            >
              <option value="">None</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <select
              name="clientId"
              defaultValue={d.clientId ?? ""}
              className={cn(inputCls, "pr-8")}
            >
              <option value="">None</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shoot">
            <select
              name="shootId"
              defaultValue={d.shootId ?? ""}
              className={cn(inputCls, "pr-8")}
            >
              <option value="">None</option>
              {shootOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Version label">
            <input
              name="versionLabel"
              defaultValue={d.versionLabel ?? ""}
              placeholder="e.g. v2"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reviewer">
            <select
              name="reviewerUserId"
              defaultValue={d.reviewerUserId ?? ""}
              className={cn(inputCls, "pr-8")}
            >
              <option value="">Unassigned</option>
              {reviewerOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name ?? "Unnamed"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Review due">
            <input
              name="reviewDueAt"
              type="date"
              defaultValue={toDateInput(d.reviewDueAt)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Due date">
          <input
            name="dueAt"
            type="date"
            defaultValue={toDateInput(d.dueAt)}
            className={inputCls}
          />
        </Field>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
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
  videoRef,
  hasVideo,
  onSeek,
}: {
  deliverableId: string;
  comments: ReviewCommentRow[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasVideo: boolean;
  onSeek: (seconds: number) => void;
}) {
  const [state, formAction, pending] = useActionState<DetailActionState, FormData>(
    postCommentAction,
    null,
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const timecodeRef = React.useRef<HTMLInputElement>(null);
  const [capturedLabel, setCapturedLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setCapturedLabel(null);
    }
  }, [state]);

  /** Read the player's current time into the timecode input, anchoring the note. */
  const captureCurrentTime = React.useCallback(() => {
    const v = videoRef.current;
    if (!v || !timecodeRef.current) return;
    const secs = Math.max(0, Math.floor(v.currentTime));
    timecodeRef.current.value = String(secs);
    setCapturedLabel(formatTimecode(secs));
  }, [videoRef]);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = React.useMemo(() => {
    const map: Record<string, ReviewCommentRow[]> = {};
    for (const c of comments) {
      if (c.parentId) (map[c.parentId] ??= []).push(c);
    }
    return map;
  }, [comments]);

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-bs-subtle" />
        <h2 className="font-display text-h3">
          Review comments{comments.length ? ` · ${comments.length}` : ""}
        </h2>
      </div>

      {comments.length > 0 ? (
        <AiGenerate
          label="Summarise comments"
          action={() => summariseCommentsAction(deliverableId)}
          className="mb-3"
        />
      ) : null}

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-bs-subtle">
              Timecode (secs)
              <input
                ref={timecodeRef}
                name="timecodeSeconds"
                type="number"
                min={0}
                placeholder="e.g. 42"
                onChange={() => setCapturedLabel(null)}
                className="h-8 w-24 rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
                aria-label="Timecode in seconds"
              />
            </label>
            {hasVideo ? (
              <button
                type="button"
                onClick={captureCurrentTime}
                className="inline-flex items-center gap-1 rounded-sm border border-bs-border bg-bs-surface px-2 py-1 text-xs text-bs-muted transition-colors hover:bg-bs-surface-2 hover:text-bs-text"
              >
                <Clock className="h-3.5 w-3.5 text-bs-subtle" />
                At current time{capturedLabel ? ` (${capturedLabel})` : ""}
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-bs-text px-3 py-1.5 text-xs font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post comment"}
          </button>
        </div>
        {state && !state.ok ? (
          <p className="text-xs text-bs-danger">{state.error}</p>
        ) : null}
      </form>

      {topLevel.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
          No review comments yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {topLevel.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesByParent[c.id] ?? []}
              deliverableId={deliverableId}
              onSeek={hasVideo ? onSeek : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  comment: c,
  replies,
  deliverableId,
  onSeek,
}: {
  comment: ReviewCommentRow;
  replies: ReviewCommentRow[];
  deliverableId: string;
  onSeek?: (seconds: number) => void;
}) {
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<DetailActionState, FormData>(
    postCommentAction,
    null,
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setReplyOpen(false);
    }
  }, [state]);

  const resolved = Boolean(c.resolvedAt);

  return (
    <li
      className={cn(
        "rounded-md border border-bs-border bg-bs-surface p-3",
        resolved && "opacity-60",
      )}
    >
      <CommentBody comment={c} deliverableId={deliverableId} onSeek={onSeek} />

      {/* Actions */}
      <div className="mt-2 flex items-center gap-3">
        <ResolveToggle comment={c} deliverableId={deliverableId} />
        <button
          type="button"
          onClick={() => setReplyOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-bs-subtle transition-colors hover:text-bs-text"
        >
          <CornerDownRight className="h-3.5 w-3.5" /> Reply
        </button>
      </div>

      {replyOpen ? (
        <form
          ref={formRef}
          action={formAction}
          className="mt-2 space-y-2 rounded-sm border border-dashed border-bs-border bg-bs-surface-2 p-2.5"
        >
          <input type="hidden" name="deliverableId" value={deliverableId} />
          <input type="hidden" name="parentId" value={c.id} />
          <textarea
            name="body"
            required
            autoFocus
            rows={2}
            placeholder="Write a reply…"
            className="w-full resize-y rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
            aria-label="Reply"
          />
          {state && !state.ok ? (
            <p className="text-xs text-bs-danger">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReplyOpen(false)}
              className="text-xs text-bs-subtle transition-colors hover:text-bs-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-bs-text px-3 py-1.5 text-xs font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Replying…" : "Reply"}
            </button>
          </div>
        </form>
      ) : null}

      {replies.length > 0 ? (
        <ul className="mt-2.5 space-y-2 border-l-2 border-bs-border pl-3">
          {replies.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-sm border border-bs-border bg-bs-surface-2 p-2.5",
                r.resolvedAt && "opacity-60",
              )}
            >
              <CommentBody comment={r} deliverableId={deliverableId} onSeek={onSeek} />
              <div className="mt-1.5">
                <ResolveToggle comment={r} deliverableId={deliverableId} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CommentBody({
  comment: c,
  deliverableId,
  onSeek,
}: {
  comment: ReviewCommentRow;
  deliverableId: string;
  onSeek?: (seconds: number) => void;
}) {
  const timecode = c.timecodeSeconds;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-bs-text">
            {c.authorName ?? "Unknown"}
          </span>
          {timecode != null ? (
            onSeek ? (
              <button
                type="button"
                onClick={() => onSeek(timecode)}
                title="Jump to this point in the video"
                className="inline-flex items-center gap-1.5 rounded-pill bg-bs-info-soft px-2 py-0.5 text-xs font-medium text-bs-info transition-opacity hover:opacity-80"
              >
                @ {formatTimecode(timecode)}
              </button>
            ) : (
              <StatusPill tone="info">@ {formatTimecode(timecode)}</StatusPill>
            )
          ) : null}
          {c.resolvedAt ? <StatusPill tone="success">Resolved</StatusPill> : null}
        </div>
        <span className="text-xs text-bs-subtle">
          {dateTimeFmt.format(new Date(c.createdAt))}
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-bs-muted">{c.body}</p>
    </>
  );
}

function ResolveToggle({
  comment: c,
  deliverableId,
}: {
  comment: ReviewCommentRow;
  deliverableId: string;
}) {
  const resolved = Boolean(c.resolvedAt);
  return (
    <form action={resolveCommentAction} className="inline">
      <input type="hidden" name="commentId" value={c.id} />
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="resolved" value={String(resolved)} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 text-xs text-bs-subtle transition-colors hover:text-bs-text"
      >
        {resolved ? "Reopen" : "Resolve"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-bs-text">{label}</span>
      {children}
    </label>
  );
}
