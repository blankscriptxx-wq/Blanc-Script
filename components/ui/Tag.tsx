import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TagProps = {
  children: ReactNode;
  tone?: "coral" | "teal" | "gold" | "neutral" | "light";
  className?: string;
};

const tones: Record<NonNullable<TagProps["tone"]>, string> = {
  coral: "bg-coral/10 text-coral-dark",
  teal: "bg-teal/12 text-teal-dark",
  gold: "bg-gold/15 text-gold-dark",
  neutral: "bg-charcoal/8 text-charcoal-soft",
  light: "bg-white/10 text-cream/80",
};

export function Tag({ children, tone = "neutral", className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
