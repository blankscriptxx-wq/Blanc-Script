"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode, ElementType } from "react";
import { fadeUp } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  variants?: Variants;
  className?: string;
  /** Delay in seconds before the animation begins. */
  delay?: number;
  /** Amount of the element that must be visible before animating (0–1). */
  amount?: number;
  once?: boolean;
  as?: ElementType;
};

/**
 * Scroll-triggered reveal. When the user prefers reduced motion, content is
 * rendered immediately with no transform — so the site is fully usable and
 * nothing stays hidden if animations are disabled.
 */
export function Reveal({
  children,
  variants = fadeUp,
  className,
  delay = 0,
  amount = 0.2,
  once = true,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion(as as ElementType);

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
