"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Desktop-only custom cursor: a small dot with a trailing ring that grows over
 * interactive elements. Disabled on touch devices and when the user prefers
 * reduced motion — it's a pure enhancement, never required for usability.
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);

    let rx = 0, ry = 0, x = 0, y = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current) {
        ring.current.style.transform = `translate(${rx}px, ${ry}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    const grow = () => ring.current?.classList.add("cursor-grow");
    const shrink = () => ring.current?.classList.remove("cursor-grow");

    window.addEventListener("mousemove", onMove);
    document.querySelectorAll("a, button, input, textarea, select, [role='button']").forEach((el) => {
      el.addEventListener("mouseenter", grow);
      el.addEventListener("mouseleave", shrink);
    });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] hidden lg:block">
      <div
        ref={ring}
        className="fixed -left-4 -top-4 h-8 w-8 rounded-full border border-coral/60 transition-[width,height,opacity] duration-200 [&.cursor-grow]:h-12 [&.cursor-grow]:w-12 [&.cursor-grow]:border-teal"
      />
      <div
        ref={dot}
        className="fixed -left-1 -top-1 h-2 w-2 rounded-full bg-coral"
      />
    </div>
  );
}
