"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** Right-side record drawer — the primary detail pattern. */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
            className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[440px] flex-col border-l border-bs-border bg-bs-overlay shadow-elev-3"
            role="dialog"
            aria-modal="true"
          >
            <header className="flex items-start gap-2 border-b border-bs-border px-5 py-4">
              <div className="min-w-0">
                {eyebrow ? (
                  <div className="text-eyebrow uppercase text-bs-subtle">{eyebrow}</div>
                ) : null}
                <div className="font-display text-h2 text-bs-text">{title}</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer ? (
              <div className="border-t border-bs-border p-4">{footer}</div>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
