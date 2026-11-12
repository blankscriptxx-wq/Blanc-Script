import { cn } from "@/lib/cn";

export type BarTone =
  | "accent"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold"
  | "neutral";

export type BarDatum = {
  label: string;
  value: number;
  tone?: BarTone;
};

const toneVar: Record<BarTone, string> = {
  accent: "var(--bs-accent)",
  primary: "var(--bs-primary)",
  success: "var(--bs-success)",
  warning: "var(--bs-warning)",
  danger: "var(--bs-danger)",
  info: "var(--bs-info)",
  gold: "var(--bs-gold)",
  neutral: "var(--bs-neutral)",
};

/**
 * A titled card of horizontal bar rows: each row is a label, a count, and a
 * proportional bar scaled to the largest value in the set. Pure markup — safe
 * in a server component.
 */
export function BarRows({
  title,
  data,
  className,
}: {
  title: string;
  data: BarDatum[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      className={cn(
        "rounded-md border border-bs-border bg-bs-surface p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-h3 text-bs-text">{title}</h3>
        <span className="text-xs tabular-nums text-bs-subtle">{total} total</span>
      </div>
      <ul className="space-y-2.5">
        {data.map((d) => {
          const pct = Math.round((d.value / max) * 100);
          const tone = d.tone ?? "accent";
          return (
            <li key={d.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-bs-muted">{d.label}</span>
                <span className="tabular-nums font-medium text-bs-text">{d.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-bs-neutral-soft">
                <div
                  className="h-full rounded-pill transition-[width] duration-500 ease-editorial"
                  style={{
                    width: `${d.value === 0 ? 0 : Math.max(pct, 4)}%`,
                    background: toneVar[tone],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
