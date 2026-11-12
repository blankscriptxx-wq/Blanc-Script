"use client";

import { Spotlight, CountUp, Reveal } from "@/components/ds/motion";

export type KpiTile = {
  label: string;
  value: number;
  hint?: string;
  /** Render as a GBP money figure (pence → £) instead of a plain count. */
  money?: boolean;
};

/** A responsive row of headline metric tiles with a staggered reveal. */
export function KpiTiles({ items }: { items: KpiTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((k, i) => (
        <Reveal key={k.label} delay={i * 0.05}>
          <Spotlight className="h-full rounded-md border border-bs-border bg-bs-surface p-4">
            <div className="text-eyebrow uppercase text-bs-subtle">{k.label}</div>
            <div className="mt-1 font-display text-h1 text-bs-text">
              {k.money ? (
                <CountUp value={k.value / 100} prefix="£" />
              ) : (
                <CountUp value={k.value} />
              )}
            </div>
            {k.hint ? <div className="mt-1 text-xs text-bs-muted">{k.hint}</div> : null}
          </Spotlight>
        </Reveal>
      ))}
    </div>
  );
}
