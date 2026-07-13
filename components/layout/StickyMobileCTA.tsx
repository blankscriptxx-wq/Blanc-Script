"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cta } from "@/data/navigation";
import { cn } from "@/lib/utils";

/**
 * Subtle sticky bottom CTA on mobile only. Appears after the user scrolls past
 * the hero and hides on the contact page (where the form already is). Does not
 * obstruct content — sits above the safe-area inset.
 */
export function StickyMobileCTA() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/contact")) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-editorial sm:hidden",
        show ? "translate-y-0" : "translate-y-[130%]"
      )}
    >
      <Link
        href={cta.primary.href}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-pill bg-coral font-semibold text-white shadow-[0_12px_30px_-8px_rgba(232,55,91,0.7)]"
      >
        {cta.primary.label}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
