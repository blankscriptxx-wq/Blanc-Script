"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MessageSquareQuote, ChevronDown, Check, Send, X, Lightbulb, LineChart } from "lucide-react";
import { AiGenerate } from "@/components/ai/ai-generate";
import { StatusPill } from "@/components/ds/status-pill";
import { Uploader } from "@/components/uploads/uploader";
import { FileList } from "@/components/uploads/file-list";
import { cn } from "@/lib/cn";
import {
  generateScriptAction,
  generateIdeasAction,
  refineScriptAction,
  fillMonthAction,
  logResultAction,
  setScriptStatusAction,
  pushScriptToContentAction,
  archiveScriptAction,
} from "@/app/(os)/(app)/clients/[id]/strategy/actions";
import type { ScriptRow, ScriptFormat, ScriptStatus } from "@/lib/data/scripts";
import type { ScriptMediaRow } from "@/lib/data/media";

// ── Tokens ────────────────────────────────────────────────────────────────────
type Tone = "info" | "accent" | "gold" | "success" | "warning" | "danger" | "neutral";

const STATUS_TONE: Record<ScriptStatus, Tone> = {
  idea: "neutral",
  draft: "info",
  review: "warning",
  approved: "accent",
  produced: "success",
};

const STATUS_LABEL: Record<ScriptStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  produced: "Produced",
};

const STATUS_ORDER: ScriptStatus[] = ["idea", "draft", "review", "approved", "produced"];

const FORMAT_LABEL: Record<ScriptFormat, string> = {
  reel: "Reel",
  tiktok: "TikTok",
  youtube_short: "YouTube Short",
  youtube_long: "YouTube",
  ad: "Ad",
  other: "Other",
};

const selectCls =
  "h-8 rounded-sm border border-bs-border-strong bg-bs-surface pl-2.5 pr-7 text-sm text-bs-text outline-none disabled:opacity-60";

// ── Panel ──────────────────────────────────────────────────────────────────────
export function ScriptsPanel({
  clientId,
  scripts,
  scriptMedia = [],
  storageReady = false,
  aiReady,
}: {
  clientId: string;
  scripts: ScriptRow[];
  scriptMedia?: ScriptMediaRow[];
  storageReady?: boolean;
  aiReady: boolean;
}) {
  const router = useRouter();
  const [brief, setBrief] = React.useState("");

  return (
    <div className="space-y-6">
      {/* Generate */}
      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <h3 className="font-display text-h3 text-bs-text">Script studio</h3>
        <p className="mt-1 text-sm text-bs-muted">
          Draft a short-form script — complete with a visual hook and a spoken hook — grounded in
          this client&rsquo;s brain.
        </p>

        {aiReady ? (
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Brief or idea (optional)…"
              className="h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle"
            />
            <div className="flex flex-wrap items-center gap-2">
              <AiGenerate
                label="Generate script"
                action={() => generateScriptAction(clientId, brief)}
                onResult={() => {
                  setBrief("");
                  router.refresh();
                }}
              />
              <AiGenerate
                label="Generate 5 ideas"
                action={() => generateIdeasAction(clientId, 5)}
                onResult={() => router.refresh()}
              />
              <AiGenerate
                label="Fill next month"
                action={() => fillMonthAction(clientId, 8)}
                onResult={() => router.refresh()}
              />
            </div>
            <p className="text-xs text-bs-subtle">
              &ldquo;Fill next month&rdquo; drops a month of post ideas onto the content calendar
              for this client.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-sm border border-dashed border-bs-border bg-bs-surface-2 px-3 py-2.5 text-sm text-bs-muted">
            Add an Anthropic API key in Settings &rarr; Integrations to generate scripts.
          </p>
        )}
      </div>

      {/* List */}
      {scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-bs-border bg-bs-surface px-6 py-12 text-center">
          <p className="font-serif text-h3 italic text-bs-text">No scripts yet</p>
          <p className="mt-1 max-w-sm text-sm text-bs-muted">
            {aiReady
              ? "Generate your first script above, and it will appear here ready to shape and push to the content calendar."
              : "Once an API key is connected, scripts you generate will collect here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {scripts.map((script) => (
            <li key={script.id}>
              <ScriptCard
                clientId={clientId}
                script={script}
                media={scriptMedia.filter((m) => m.scriptId === script.id)}
                storageReady={storageReady}
                aiReady={aiReady}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
function ScriptCard({
  clientId,
  script,
  media = [],
  storageReady = false,
  aiReady = false,
}: {
  clientId: string;
  script: ScriptRow;
  media?: ScriptMediaRow[];
  storageReady?: boolean;
  aiReady?: boolean;
}) {
  const router = useRouter();
  const [showBody, setShowBody] = React.useState(false);
  const [refineOpen, setRefineOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const pushed = Boolean(script.contentItemId);

  return (
    <div className="rounded-md border border-bs-border bg-bs-surface">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0 space-y-2">
          <h4 className="font-display text-h3 leading-snug text-bs-text">{script.title}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="neutral">{FORMAT_LABEL[script.format]}</StatusPill>
            <StatusPill tone={STATUS_TONE[script.status]}>
              {STATUS_LABEL[script.status]}
            </StatusPill>
            {script.parentScriptId ? <StatusPill tone="info">New version</StatusPill> : null}
          </div>
        </div>

        {/* Archive */}
        <form action={archiveScriptAction} className="shrink-0">
          <input type="hidden" name="id" value={script.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <button
            type="submit"
            aria-label="Archive script"
            title="Archive script"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-bs-subtle transition-colors hover:bg-bs-surface-2 hover:text-bs-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Hooks — the heart of the feature, two clearly distinct treatments */}
      <div className="grid gap-3 px-5 sm:grid-cols-2">
        <div className="rounded-sm border-l-2 border-bs-info bg-bs-info-soft p-3">
          <div className="flex items-center gap-1.5 text-eyebrow uppercase text-bs-info">
            <Eye className="h-3.5 w-3.5" />
            Visual hook
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-snug text-bs-text">
            {script.hookVisual?.trim() || (
              <span className="font-normal italic text-bs-subtle">No visual hook yet.</span>
            )}
          </p>
        </div>

        <div className="rounded-sm border-l-2 border-bs-gold bg-bs-gold-soft p-3">
          <div className="flex items-center gap-1.5 text-eyebrow uppercase text-bs-gold-ink">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Script hook
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-snug text-bs-gold-ink">
            {script.hookScript?.trim() || (
              <span className="font-normal italic opacity-70">No script hook yet.</span>
            )}
          </p>
        </div>
      </div>

      {/* Body (collapsible) */}
      {script.body?.trim() ? (
        <div className="px-5 pt-3">
          <button
            type="button"
            onClick={() => setShowBody((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-bs-subtle transition-colors hover:text-bs-text"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showBody && "rotate-180")}
            />
            {showBody ? "Hide script" : "Show script"}
          </button>
          {showBody ? (
            <p className="mt-2 whitespace-pre-wrap rounded-sm border border-bs-border bg-bs-surface-2 p-3 text-sm leading-relaxed text-bs-text">
              {script.body}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Refine into a new version */}
      {aiReady ? (
        <div className="px-5 pt-3">
          {refineOpen ? (
            <div className="space-y-2 rounded-sm border border-dashed border-bs-border p-3">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What should the new version do differently? (optional)"
                className="h-8 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
              />
              <div className="flex items-center gap-2">
                <AiGenerate
                  label="Create new version"
                  action={() => refineScriptAction(script.id, feedback)}
                  onResult={() => {
                    setFeedback("");
                    setRefineOpen(false);
                    router.refresh();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setRefineOpen(false)}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRefineOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-bs-primary transition-colors hover:underline"
            >
              ✨ Refine into a new version
            </button>
          )}
        </div>
      ) : null}

      {/* Reference frames (visual-hook references) */}
      <div className="px-5 pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-bs-subtle">Reference frames</span>
          <Uploader context={{ scriptId: script.id, clientId }} configured={storageReady} label="Attach" />
        </div>
        <FileList rows={media} />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bs-border p-5 pt-3">
        <form action={setScriptStatusAction}>
          <input type="hidden" name="id" value={script.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <label className="inline-flex items-center gap-2">
            <span className="text-xs text-bs-subtle">Status</span>
            <select
              name="status"
              defaultValue={script.status}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className={selectCls}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <LogResult clientId={clientId} scriptId={script.id} />
          <form action={pushScriptToContentAction}>
            <input type="hidden" name="id" value={script.id} />
            <input type="hidden" name="clientId" value={clientId} />
            <button
              type="submit"
              disabled={pushed}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors",
                pushed
                  ? "cursor-default bg-bs-success-soft text-bs-success"
                  : "bg-bs-primary text-bs-on-accent hover:bg-bs-primary-hover",
              )}
            >
              {pushed ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Added &#10003;
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Push to Content
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Log how a produced script performed → proposes a performance insight to the brain. */
function LogResult({ clientId, scriptId }: { clientId: string; scriptId: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<{ ok?: boolean; error?: string }, FormData>(
    logResultAction,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-bs-border-strong px-3 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2"
      >
        <LineChart className="h-3.5 w-3.5 text-bs-primary" /> Log result
      </button>
    );
  }
  return (
    <form ref={formRef} action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="scriptId" value={scriptId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="result"
        placeholder="e.g. 120k views, saves high…"
        className="h-8 w-52 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 items-center gap-1 rounded-sm bg-bs-text px-2.5 text-xs font-medium text-bs-surface disabled:opacity-60"
      >
        <Lightbulb className="h-3.5 w-3.5" /> {pending ? "Learning…" : "Learn"}
      </button>
      {state?.error ? <span className="text-xs text-bs-danger">{state.error}</span> : null}
    </form>
  );
}
