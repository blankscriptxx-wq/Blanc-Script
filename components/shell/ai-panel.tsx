"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { askAssistantAction } from "@/app/(os)/(app)/ai/actions";
import { cn } from "@/lib/cn";

const QUICK_ACTIONS = [
  "What needs me today?",
  "Which edits are in review?",
  "Summarise my recent activity",
  "What's outstanding in finance?",
];

type Msg = { role: "user" | "assistant" | "error"; text: string };

/** Blanc Script AI — a working assistant grounded in the workspace. Needs an
 *  Anthropic API key (Settings → Integrations); without it, it says so. */
export function AIPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setPending(true);
    const res = await askAssistantAction(question);
    setMessages((m) => [
      ...m,
      res.ok ? { role: "assistant", text: res.text } : { role: "error", text: res.error },
    ]);
    setPending(false);
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[400px] flex-col border-l border-bs-border bg-bs-overlay shadow-elev-3"
            role="dialog"
            aria-label="Blanc Script AI"
          >
            <header className="flex h-14 items-center gap-2 border-b border-bs-border px-4">
              <span className="grid h-7 w-7 place-items-center rounded-sm bg-bs-primary-soft text-bs-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-display text-h3">Blanc Script AI</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto grid h-8 w-8 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <>
                  <p className="font-serif text-h3 italic text-bs-text">
                    Your assistant, grounded in your workspace.
                  </p>
                  <p className="mt-2 text-sm text-bs-muted">
                    It answers from your real clients, shoots, edits and invoices, and only
                    within your permissions — it never moves money or sends anything.
                  </p>
                  <div className="mt-5 text-eyebrow uppercase text-bs-subtle">Try asking</div>
                  <div className="mt-2 grid gap-2">
                    {QUICK_ACTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="group flex items-center justify-between rounded-md border border-bs-border bg-bs-surface px-3 py-2.5 text-left text-sm text-bs-text/90 transition-colors hover:bg-bs-surface-2"
                      >
                        <span>{q}</span>
                        <ArrowUp className="h-4 w-4 rotate-45 text-bs-subtle" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm",
                        m.role === "user"
                          ? "ml-6 bg-bs-primary-soft text-bs-text"
                          : m.role === "error"
                            ? "bg-bs-danger-soft text-bs-danger"
                            : "mr-6 bg-bs-surface text-bs-text",
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                  {pending ? (
                    <div className="mr-6 flex items-center gap-2 rounded-md bg-bs-surface px-3 py-2 text-sm text-bs-subtle">
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-bs-border p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 rounded-pill border border-bs-border-strong bg-bs-surface px-3 py-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent text-body outline-none placeholder:text-bs-subtle"
                />
                <button
                  type="submit"
                  disabled={pending || !input.trim()}
                  aria-label="Send"
                  className="grid h-7 w-7 place-items-center rounded-pill bg-bs-primary text-bs-on-accent disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
