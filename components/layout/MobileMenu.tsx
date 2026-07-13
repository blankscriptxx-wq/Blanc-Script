"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { mainNav, cta } from "@/data/navigation";
import { site } from "@/data/site";
import { Wordmark } from "./Wordmark";
import { Button } from "@/components/ui/Button";
import { SocialLinks } from "./SocialLinks";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Full-screen slide-in mobile menu.
 * - Body scroll lock while open
 * - Focus trap + Escape to close
 * - Large 44px+ tap targets, visible "Start a Project" CTA
 * - Respects reduced motion
 */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Escape to close + focus management
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Simple focus trap
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] lg:hidden"
          initial={reduce ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <motion.div
            ref={panelRef}
            className="grain absolute inset-0 flex flex-col bg-charcoal px-6 pb-10 pt-5 text-cream"
            initial={reduce ? { x: 0 } : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <Wordmark tone="light" />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 text-cream transition-colors hover:bg-cream hover:text-charcoal"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav aria-label="Mobile" className="mt-12 flex flex-col">
              {mainNav.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.05, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block border-b border-cream/10 py-4 font-display text-3xl font-semibold tracking-tight text-cream transition-colors hover:text-teal"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="mt-auto space-y-6 pt-10">
              <Button href={cta.primary.href} variant="primary" size="lg" withArrow className="w-full">
                {cta.primary.label}
              </Button>
              <div className="flex items-center justify-between">
                <a
                  href={`mailto:${site.contact.email}`}
                  className="text-sm text-cream/70 underline-offset-4 hover:underline"
                >
                  {site.contact.email}
                </a>
                <SocialLinks tone="light" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
