import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "accent" | "success" | "warning" | "danger" | "neutral";

const toneClass: Record<Tone, string> = {
  info: "bg-bs-info-soft text-bs-info",
  accent: "bg-bs-accent-soft text-bs-accent",
  success: "bg-bs-success-soft text-bs-success",
  warning: "bg-bs-warning-soft text-bs-warning",
  danger: "bg-bs-danger-soft text-bs-danger",
  neutral: "bg-bs-neutral-soft text-bs-neutral",
};

/** Universal status token. Colour is never the sole signal — always a label. */
export function StatusPill({
  tone = "neutral",
  children,
  icon,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
