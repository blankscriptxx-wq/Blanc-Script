import { cn } from "@/lib/cn";
import type { ActivityPoint } from "@/lib/data/insights";

const weekday = new Intl.DateTimeFormat("en-GB", {
  weekday: "narrow",
  timeZone: "Europe/London",
});
const full = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/London",
});

/**
 * A tiny 14-day activity sparkline built from div bars — no charting library.
 * Bar heights are proportional to the busiest day in the window.
 */
export function SparklineBars({
  data,
  className,
}: {
  data: ActivityPoint[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const busiest = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);

  return (
    <div
      className={cn(
        "rounded-md border border-bs-border bg-bs-surface p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-h3 text-bs-text">Activity · last 14 days</h3>
        <span className="text-xs tabular-nums text-bs-subtle">{total} events</span>
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {data.map((d) => {
          // `${day}T00:00` keeps the date local rather than shifting via UTC.
          const date = new Date(`${d.day}T00:00:00`);
          const pct = d.count === 0 ? 0 : Math.max(Math.round((d.count / max) * 100), 6);
          return (
            <div
              key={d.day}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${full.format(date)} · ${d.count} ${d.count === 1 ? "event" : "events"}`}
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-sm transition-[height] duration-500 ease-editorial"
                  style={{ height: `${pct}%`, background: "var(--bs-accent)" }}
                />
              </div>
              <span className="text-[10px] leading-none text-bs-subtle">
                {weekday.format(date)}
              </span>
            </div>
          );
        })}
      </div>
      {total > 0 ? (
        <div className="mt-3 text-xs text-bs-muted">
          Busiest: {full.format(new Date(`${busiest.day}T00:00:00`))} ·{" "}
          {busiest.count} {busiest.count === 1 ? "event" : "events"}
        </div>
      ) : (
        <div className="mt-3 text-xs text-bs-subtle">
          No activity logged in this window yet.
        </div>
      )}
    </div>
  );
}
