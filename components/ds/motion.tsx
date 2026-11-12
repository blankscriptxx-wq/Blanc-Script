"use client";

import * as React from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Spotlight — a pointer-following accent glow + subtle lift on hover.
 * Wraps any card/panel. The glow uses the `.bs-spotlight` CSS (globals.css).
 */
export function Spotlight({
  as: As = "div",
  className,
  lift = true,
  children,
  ...rest
}: {
  as?: React.ElementType;
  className?: string;
  lift?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--bs-spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--bs-spot-y", `${e.clientY - r.top}px`);
  };
  return (
    <As
      ref={ref}
      onPointerMove={onMove}
      className={cn(
        "bs-spotlight transition-[transform,box-shadow] duration-200 ease-editorial",
        lift && "hover:-translate-y-0.5 hover:shadow-elev-2",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

/** A live pulsing status dot. */
export function PulseDot({
  tone = "accent",
  className,
}: {
  tone?: "accent" | "success" | "danger" | "warning" | "primary";
  className?: string;
}) {
  const color =
    tone === "success"
      ? "var(--bs-success)"
      : tone === "danger"
        ? "var(--bs-danger)"
        : tone === "warning"
          ? "var(--bs-warning)"
          : tone === "primary"
            ? "var(--bs-primary)"
            : "var(--bs-accent)";
  return (
    <span className={cn("relative inline-grid h-2.5 w-2.5 place-items-center", className)}>
      <span
        className="absolute h-2.5 w-2.5 animate-ping rounded-full opacity-70"
        style={{ background: color }}
      />
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

/** Count-up number, triggered when it scrolls into view. */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = React.useState("0");

  React.useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  React.useEffect(() => {
    return spring.on("change", (v) => {
      setDisplay(
        v.toLocaleString("en-GB", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      );
    });
  }, [spring, decimals]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/** Staggered fade-in-up for lists of cards. */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
