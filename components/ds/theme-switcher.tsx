"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Droplets } from "lucide-react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "glass";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "glass", label: "Liquid Glass", icon: Droplets },
];

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTheme(): [Theme, (t: Theme, origin?: { x: number; y: number }) => void] {
  const [theme, setThemeState] = React.useState<Theme>("light");
  React.useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme") as Theme | null;
    setThemeState(attr ?? systemTheme());
  }, []);
  const setTheme = (t: Theme, origin?: { x: number; y: number }) => {
    const apply = () => {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("bs-theme", t);
      } catch {}
      setThemeState(t);
    };
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (origin && doc.startViewTransition && !reduce) {
      document.documentElement.style.setProperty("--vt-x", `${origin.x}px`);
      document.documentElement.style.setProperty("--vt-y", `${origin.y}px`);
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  };
  return [theme, setTheme];
}

/** Segmented 3-way theme control with a gliding active pill. */
export function ThemeSwitcher({
  size = "md",
  showLabels = false,
  className,
}: {
  size?: "sm" | "md";
  showLabels?: boolean;
  className?: string;
}) {
  const [theme, setTheme] = useTheme();
  const dim = size === "sm" ? "h-8" : "h-9";
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill border border-bs-border bg-bs-surface-2 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={(e) =>
              setTheme(opt.value, { x: e.clientX, y: e.clientY })
            }
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-pill px-2.5 text-xs font-medium transition-colors",
              dim,
              active ? "text-bs-on-accent" : "text-bs-muted hover:text-bs-text",
            )}
          >
            {active ? (
              <motion.span
                layoutId="theme-active-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-pill bg-bs-primary"
              />
            ) : null}
            <Icon className="h-[15px] w-[15px]" />
            {showLabels ? <span>{opt.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
