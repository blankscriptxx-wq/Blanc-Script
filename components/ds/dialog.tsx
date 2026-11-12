"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-start justify-center overflow-y-auto bg-black/30 p-4 pt-[10vh] backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md overflow-hidden rounded-lg border border-bs-border bg-bs-overlay shadow-elev-3"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-bs-border px-5 py-3.5">
              <div>
                <h2 className="font-display text-h3 text-bs-text">{title}</h2>
                {description ? (
                  <p className="mt-0.5 text-sm text-bs-muted">{description}</p>
                ) : null}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
