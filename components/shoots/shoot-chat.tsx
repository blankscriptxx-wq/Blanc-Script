"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { shootChatAction } from "@/app/(os)/(app)/clients/[id]/strategy/actions";
import type { ChatMessage } from "@/lib/ai/claude";

type Bubble = { role: "user" | "assistant" | "error"; text: string };

/** Show **bold** as bold instead of leaving the asterisks in. */
const rich = (text: string) =>
  text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );

const STARTERS = [
  "Suggest 3 more scripts that would suit this shoot's location and talent.",
  "What should we film first to make the best use of the time?",
  "Give me a shot list we can reuse across these scripts.",
];

/**
 * Plan a shoot with the AI strategist. It knows the client, every script they
 * have had, and this shoot's date, place, talent and run sheet. Agree a plan,
 * say "go ahead", and the scripts land on this shoot's run sheet as drafts.
 */
export function ShootChat({ shootId, messages, aiReady }: { shootId: string; messages: ChatMessage[]; aiReady: boolean }) {
  const router = useRouter();
  const [local, setLocal] = React.useState<Bubble[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const seeded = messages.length;

  // Once the server has the new turns, drop the local copies.
  React.useEffect(() => setLocal([]), [seeded]);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [local, pending, seeded]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || pending || !aiReady) return;
    setInput("");
    setLocal((m) => [...m, { role: "user", text: q }]);
    setPending(true);
    const res = await shootChatAction(shootId, q).catch(() => ({
      ok: false as const,
      error: "That took too long to come back. Refresh the page — anything written is saved.",
    }));
    setPending(false);
    if (res.ok) router.refresh();
    else setLocal((m) => [...m, { role: "error", text: res.error }]);
  };

  const all: Bubble[] = [...messages.map((m) => ({ role: m.role, text: m.content })), ...local];

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-bs-primary" />
        <h2 className="font-display text-h2 text-bs-text">Plan this shoot with AI</h2>
      </div>
      <p className="mt-1 text-sm text-bs-muted">
        Talk through ideas for this shoot. When the plan is agreed, say &ldquo;go ahead&rdquo; and the scripts are added to the list above as drafts.
      </p>

      <div className="mt-3 overflow-hidden rounded-md border border-bs-border bg-bs-surface">
        {all.length ? (
          <div ref={scrollRef} className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
            {all.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[90%] whitespace-pre-wrap break-words rounded-md px-3 py-2 text-body leading-relaxed " +
                    (m.role === "user"
                      ? "bg-bs-text text-bs-surface"
                      : m.role === "error"
                        ? "border border-bs-danger text-bs-danger"
                        : "bg-bs-surface-2 text-bs-text")
                  }
                >
                  {rich(m.text)}
                </div>
              </div>
            ))}
            {pending ? (
              <div className="flex items-center gap-2 text-sm text-bs-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking… writing scripts can take a minute or two.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-4">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!aiReady || pending}
                onClick={() => void send(s)}
                className="rounded-pill border border-bs-border-strong px-3 py-1.5 text-left text-sm text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
            {pending ? (
              <div className="flex w-full items-center gap-2 text-sm text-bs-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            ) : null}
          </div>
        )}

        <div className="border-t border-bs-border p-3">
          {!aiReady ? <p className="mb-2 text-xs text-bs-subtle">AI isn&apos;t switched on yet.</p> : null}
          {aiReady && all.length ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void send("Go ahead and write the scripts we've agreed.")}
              className="mb-2 inline-flex h-9 items-center rounded-pill border border-bs-border-strong px-3 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
            >
              Go ahead — write these scripts
            </button>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 rounded-pill border border-bs-border-strong bg-bs-surface px-3 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask, or describe what you want to film…"
              disabled={!aiReady || pending}
              className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-bs-subtle disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!aiReady || pending || !input.trim()}
              aria-label="Send"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-bs-primary text-bs-on-accent disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
