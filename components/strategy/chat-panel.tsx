"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUp, Plus, MessageSquare, Sparkles, BrainCircuit, Check } from "lucide-react";
import {
  chatAction,
  newThreadAction,
  captureInsightAction,
} from "@/app/(app)/clients/[id]/strategy/actions";
import type { ThreadRow } from "@/lib/data/client-chat";
import type { ChatMessage } from "@/lib/ai/claude";
import { cn } from "@/lib/cn";

type Bubble = { role: "user" | "assistant" | "error"; text: string };

const EXAMPLE_PROMPTS = [
  "Plan next month's content",
  "Give me 5 reel ideas",
  "Write a script for our best-selling product",
];

/** Relative "time ago" for the thread list, British English, no deps. */
function relativeTime(value: Date): string {
  const then = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Per-client AI chat for Blanc Script OS. Threads reload their history from the
 * server (via the `?thread=` param); new turns in the current session are held
 * locally and optimistically rendered, then persisted with router.refresh().
 */
export function ChatPanel({
  clientId,
  threads,
  activeThreadId,
  messages,
  aiReady,
}: {
  clientId: string;
  threads: ThreadRow[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  aiReady: boolean;
}) {
  const router = useRouter();
  // New turns this session, layered over the server-seeded `messages`.
  const [local, setLocal] = React.useState<Bubble[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Reset the local turns whenever we switch thread (server history takes over).
  React.useEffect(() => {
    setLocal([]);
  }, [activeThreadId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [local, pending, activeThreadId]);

  const goToThread = React.useCallback(
    (threadId: string) => {
      router.push(`/clients/${clientId}/strategy?thread=${threadId}`);
    },
    [router, clientId],
  );

  async function startThread(): Promise<string | null> {
    if (creating) return null;
    setCreating(true);
    const res = await newThreadAction(clientId);
    setCreating(false);
    if (res.ok && res.threadId) {
      goToThread(res.threadId);
      return res.threadId;
    }
    return null;
  }

  async function send(text: string, threadId: string) {
    const q = text.trim();
    if (!q || pending) return;
    setInput("");
    setLocal((m) => [...m, { role: "user", text: q }]);
    setPending(true);
    const res = await chatAction(threadId, q);
    setLocal((m) => [
      ...m,
      res.ok ? { role: "assistant", text: res.text } : { role: "error", text: res.error },
    ]);
    setPending(false);
    if (res.ok) router.refresh(); // persist into the server-rendered history
  }

  async function onExample(prompt: string) {
    if (!aiReady || pending || creating) return;
    // No thread yet: create one, then send into it.
    const threadId = activeThreadId ?? (await startThread());
    if (threadId) await send(prompt, threadId);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeThreadId) void send(input, activeThreadId);
  }

  const hasTranscript = messages.length > 0 || local.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 md:flex-row">
      {/* Thread rail — a column on wide screens, a scrolling row on narrow ones. */}
      <aside className="flex shrink-0 flex-col gap-2 md:w-60">
        <button
          onClick={() => void startThread()}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-bs-primary px-3.5 py-2 text-body font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:pointer-events-none disabled:opacity-40"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New conversation
        </button>

        {threads.length > 0 ? (
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mt-2 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto">
            {threads.map((t) => {
              const active = t.id === activeThreadId;
              return (
                <button
                  key={t.id}
                  onClick={() => goToThread(t.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-w-[180px] shrink-0 flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors md:min-w-0",
                    active
                      ? "border-bs-border-strong bg-bs-surface-2"
                      : "border-bs-border bg-bs-surface hover:bg-bs-surface-2",
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-bs-text">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-bs-subtle" />
                    <span className="truncate">{t.title}</span>
                  </span>
                  <span className="pl-5 text-xs text-bs-subtle">{relativeTime(t.updatedAt)}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </aside>

      {/* Main conversation area. */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-bs-border bg-bs-surface">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {activeThreadId === null ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-bs-primary-soft text-bs-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-3 font-serif text-h3 italic text-bs-text">
                Your client strategist, ready when you are.
              </p>
              <p className="mt-1 max-w-sm text-sm text-bs-muted">
                Start a conversation to plan content, ideate and write scripts — grounded in this
                client&rsquo;s brain.
              </p>
              <div className="mt-5 grid w-full max-w-sm gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => void onExample(p)}
                    disabled={!aiReady || pending || creating}
                    className="group flex items-center justify-between rounded-md border border-bs-border bg-bs-surface px-3 py-2.5 text-left text-sm text-bs-text/90 transition-colors hover:bg-bs-surface-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span>{p}</span>
                    <ArrowUp className="h-4 w-4 rotate-45 text-bs-subtle" />
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => void startThread()}
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-bs-border-strong px-3.5 py-2 text-body font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:pointer-events-none disabled:opacity-40"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  New conversation
                </button>
              </div>
            </div>
          ) : !hasTranscript ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-serif text-h3 italic text-bs-text">A fresh conversation.</p>
              <p className="mt-1 max-w-sm text-sm text-bs-muted">
                Ask anything below — content plans, reel ideas or a full script.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <ChatBubble key={`seed-${i}`} role={m.role} text={m.content} clientId={clientId} />
              ))}
              {local.map((m, i) => (
                <ChatBubble key={`local-${i}`} role={m.role} text={m.text} clientId={clientId} />
              ))}
              {pending ? (
                <div className="mr-10 flex items-center gap-2 rounded-md bg-bs-surface-2 px-3 py-2 text-sm text-bs-subtle">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Composer. */}
        <div className="border-t border-bs-border p-4">
          {!aiReady ? (
            <p className="mb-2 text-xs text-bs-subtle">
              Connect AI in Settings &rarr; Integrations to start chatting.
            </p>
          ) : null}
          <form
            onSubmit={onSubmit}
            className={cn(
              "flex items-center gap-2 rounded-pill border border-bs-border-strong bg-bs-surface px-3 py-2",
              (!aiReady || activeThreadId === null) && "opacity-60",
            )}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeThreadId === null ? "Start a conversation first…" : "Ask anything…"
              }
              disabled={!aiReady || activeThreadId === null || pending}
              className="flex-1 bg-transparent text-body outline-none placeholder:text-bs-subtle disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!aiReady || activeThreadId === null || pending || !input.trim()}
              aria-label="Send"
              className="grid h-7 w-7 place-items-center rounded-pill bg-bs-primary text-bs-on-accent disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

/** A single transcript bubble — user right-ish, assistant left, errors flagged. */
function ChatBubble({
  role,
  text,
  clientId,
}: {
  role: "user" | "assistant" | "error";
  text: string;
  clientId: string;
}) {
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  async function save() {
    if (saving || saved) return;
    setSaving(true);
    const res = await captureInsightAction(clientId, text);
    setSaving(false);
    if (res.ok) setSaved(true);
  }
  return (
    <div
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        role === "user"
          ? "ml-10 bg-bs-primary-soft text-bs-text"
          : role === "error"
            ? "mr-10 bg-bs-danger-soft text-bs-danger"
            : "mr-10 bg-bs-surface-2 text-bs-text",
      )}
    >
      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
      {role === "assistant" ? (
        <button
          type="button"
          onClick={save}
          disabled={saving || saved}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-bs-subtle transition-colors hover:text-bs-text disabled:opacity-70"
        >
          {saved ? <Check className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
          {saved ? "Saved to brain (awaiting approval)" : saving ? "Saving…" : "Save to brain"}
        </button>
      ) : null}
    </div>
  );
}
