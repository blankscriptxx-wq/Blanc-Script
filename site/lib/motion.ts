import type { Variants } from "framer-motion";

/**
 * Shared Framer Motion variants + timings.
 * All animations respect `prefers-reduced-motion` via the <Reveal> wrapper
 * and Framer's built-in `useReducedMotion` hook where used.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

export const scaleReveal: Variants = {
  hidden: { opacity: 0, scale: 1.06 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } },
};

/** Container that staggers its children (use with fadeUp items). */
export const staggerContainer = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Word/line reveal for animated headlines. */
export const lineReveal: Variants = {
  hidden: { y: "110%" },
  show: (i: number = 0) => ({
    y: "0%",
    transition: { duration: 0.8, ease: EASE, delay: 0.05 * i },
  }),
};
