"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type MarqueeProps = {
  items: ReactNode[];
  className?: string;
  itemClassName?: string;
  /** Seconds for one full loop. Larger = slower. */
  speed?: number;
  reverse?: boolean;
};

/**
 * CSS-only infinite marquee (no JS animation loop → cheap on the main thread).
 * Duplicates the item set and translates -50%. Pauses on hover, and respects
 * prefers-reduced-motion via the utility class below (animation removed).
 */
export function Marquee({
  items,
  className,
  itemClassName,
  speed = 40,
  reverse = false,
}: MarqueeProps) {
  const set = (
    <ul
      className="flex shrink-0 items-center motion-safe:animate-marquee motion-reduce:animate-none"
      style={{
        animationDuration: `${speed}s`,
        animationDirection: reverse ? "reverse" : "normal",
      }}
      aria-hidden="false"
    >
      {items.map((item, i) => (
        <li key={i} className={cn("shrink-0", itemClassName)}>
          {item}
        </li>
      ))}
    </ul>
  );

  const dupe = (
    <ul
      className="flex shrink-0 items-center motion-safe:animate-marquee motion-reduce:animate-none"
      style={{
        animationDuration: `${speed}s`,
        animationDirection: reverse ? "reverse" : "normal",
      }}
      aria-hidden="true"
    >
      {items.map((item, i) => (
        <li key={i} className={cn("shrink-0", itemClassName)}>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "group flex w-full overflow-hidden [--gap:0] hover:[animation-play-state:paused]",
        className
      )}
    >
      {set}
      {dupe}
    </div>
  );
}
