"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { stats, impactPoints } from "@/data/stats";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatNumber } from "@/lib/utils";

function Counter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <span ref={ref}>
      {prefix}
      {formatNumber(display)}
      {suffix}
    </span>
  );
}

/**
 * Results & impact. NOTE: every figure here is a PLACEHOLDER (see data/stats.ts).
 * The values are 0 until real, verified numbers are added — nothing is invented.
 */
export function Results() {
  return (
    <section className="bg-cream-deep/40 py-section" aria-labelledby="results-heading">
      <div className="shell">
        <SectionHeading
          id="results-heading"
          eyebrow="Results & impact"
          title={<>Made to move the <span className="text-coral">numbers</span>.</>}
          intro="Real outcomes from strategy-led content — across social, commercial and brand campaigns."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card border border-charcoal/12 bg-white/70 p-7">
              <p className="font-display text-4xl font-bold text-charcoal md:text-5xl">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-3 font-medium text-charcoal">{s.label}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-charcoal/40">{s.note}</p>
            </div>
          ))}
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-charcoal-soft">
          {impactPoints.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
