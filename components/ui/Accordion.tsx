"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItem[];
  tone?: "dark" | "light";
  className?: string;
};

/**
 * Accessible accordion: real <button> headers, aria-expanded/controls,
 * keyboard operable, animated panel that collapses cleanly with reduced motion.
 */
export function Accordion({ items, tone = "dark", className }: AccordionProps) {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  const baseId = useId();
  const isLight = tone === "light";

  return (
    <div className={cn("divide-y", isLight ? "divide-white/15" : "divide-charcoal/12", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${baseId}-btn-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div key={i}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className={cn(
                  "flex w-full items-center justify-between gap-6 py-5 text-left min-h-[44px]",
                  "text-lg font-medium transition-colors md:text-xl",
                  isLight ? "text-cream hover:text-teal" : "text-charcoal hover:text-coral"
                )}
              >
                <span>{item.question}</span>
                <Plus
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-300 ease-editorial",
                    isOpen && "rotate-45",
                    isLight ? "text-teal" : "text-coral"
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={reduce ? undefined : { height: 0, opacity: 0 }}
                  animate={reduce ? undefined : { height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p
                    className={cn(
                      "max-w-2xl pb-6 leading-relaxed",
                      isLight ? "text-cream/70" : "text-charcoal-soft"
                    )}
                  >
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
