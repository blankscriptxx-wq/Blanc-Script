"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowUp, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

const QUICK_ACTIONS = [
  "What needs me today?",
  "Which edits are late, and who has them?",
  "Who's waiting for a reply on WhatsApp?",
  "Draft a chase for the overdue invoices",
];

/** Blanc Script AI — slide-over. Honest preview: not wired until an Anthropic
 *  key is connected (Milestone 6). Shows what it will do, never fakes answers. */
export function AIPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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

            <div className="flex-1 overflow-y-auto p-4">
              <p className="font-serif text-h3 italic text-bs-text">
                Your assistant, grounded in your workspace.
              </p>
              <p className="mt-2 text-sm text-bs-muted">
                It answers from your real clients, shoots, edits and invoices, and
                only ever acts within your permissions — never moves money, always
                asks before sending.
              </p>

              <div className="mt-5 text-eyebrow uppercase text-bs-subtle">
                Try asking
              </div>
              <div className="mt-2 grid gap-2">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q}
                    disabled
                    className="group flex items-center justify-between rounded-md border border-bs-border bg-bs-surface px-3 py-2.5 text-left text-sm text-bs-text/90 disabled:cursor-not-allowed"
                  >
                    <span>{q}</span>
                    <ArrowUp className="h-4 w-4 rotate-45 text-bs-subtle" />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-bs-border p-4">
              <div className="mb-3 flex items-start gap-2 rounded-md bg-bs-warning-soft px-3 py-2 text-xs text-bs-warning">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Not connected yet. Add an Anthropic API key in Settings to
                  activate the assistant (planned for Milestone 6).
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-pill border border-bs-border-strong bg-bs-surface px-3 py-2 opacity-60">
                <input
                  disabled
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent text-body outline-none placeholder:text-bs-subtle"
                />
                <span className="grid h-7 w-7 place-items-center rounded-pill bg-bs-primary text-bs-on-accent">
                  <ArrowUp className="h-4 w-4" />
                </span>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
