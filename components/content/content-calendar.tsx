"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ds/button";
import type { ContentRow, ContentChannel } from "@/lib/data/content";
import { cn } from "@/lib/cn";

const CHANNEL_LABEL: Record<ContentChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  other: "Other",
};

/** Channel dot colours — registered bs tokens only, kept visually distinct. */
const CHANNEL_DOT: Record<ContentChannel, string> = {
  instagram: "bg-bs-accent",
  tiktok: "bg-bs-info",
  youtube: "bg-bs-danger",
  linkedin: "bg-bs-primary",
  other: "bg-bs-neutral",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** YYYY-MM-DD for the instant, resolved in Europe/London (en-CA → ISO-like). */
const londonKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const monthLabelFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
});

function dayKey(d: Date): string {
  return londonKeyFmt.format(d);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function cellKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

type DayCell = {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

export function ContentCalendar({
  rows,
  onSelect,
}: {
  rows: ContentRow[];
  onSelect: (row: ContentRow) => void;
}) {
  const todayKey = React.useMemo(() => dayKey(new Date()), []);
  const [todayY, todayM] = React.useMemo(() => {
    const [y, m] = todayKey.split("-").map((s) => Number(s));
    return [y, m - 1] as const;
  }, [todayKey]);

  const [cursor, setCursor] = React.useState({ year: todayY, month: todayM });

  const byDay = React.useMemo(() => {
    const map = new Map<string, ContentRow[]>();
    for (const r of rows) {
      if (!r.scheduledFor) continue;
      const key = dayKey(new Date(r.scheduledFor));
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return map;
  }, [rows]);

  const unscheduled = React.useMemo(
    () => rows.filter((r) => !r.scheduledFor),
    [rows],
  );

  const weeks = React.useMemo(() => {
    const { year, month } = cursor;
    // Weekday of the 1st, Monday-indexed (Mon=0 … Sun=6). Use UTC to stay civil.
    const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const out: DayCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const week: DayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const offset = w * 7 + i;
        const d = new Date(Date.UTC(year, month, 1 - firstDow + offset));
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth();
        const day = d.getUTCDate();
        const key = cellKey(y, m, day);
        week.push({
          key,
          day,
          inMonth: m === month && y === year,
          isToday: key === todayKey,
        });
      }
      out.push(week);
    }
    return out;
  }, [cursor, todayKey]);

  const monthLabel = monthLabelFmt.format(
    new Date(Date.UTC(cursor.year, cursor.month, 1)),
  );

  function shift(delta: number) {
    setCursor((c) => {
      const next = new Date(Date.UTC(c.year, c.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  const atToday = cursor.year === todayY && cursor.month === todayM;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 font-semibold text-bs-text">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setCursor({ year: todayY, month: todayM })
            }
            disabled={atToday}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-bs-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-eyebrow uppercase text-bs-subtle"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-b-md border-x border-b border-bs-border">
            {weeks.flat().map((cell) => {
              const items = byDay.get(cell.key) ?? [];
              return (
                <div
                  key={cell.key}
                  className={cn(
                    "flex min-h-[112px] flex-col gap-1 border-b border-r border-bs-border p-1.5",
                    cell.inMonth ? "bg-bs-surface" : "bg-bs-surface-2/40",
                    cell.isToday && "bg-bs-primary-soft",
                  )}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1 text-xs tabular-nums",
                        cell.isToday
                          ? "bg-bs-primary font-semibold text-bs-on-accent"
                          : cell.inMonth
                            ? "text-bs-muted"
                            : "text-bs-subtle",
                      )}
                    >
                      {cell.day}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelect(r)}
                        title={`${r.title} · ${CHANNEL_LABEL[r.channel]}${
                          r.scheduledFor
                            ? ` · ${timeFmt.format(new Date(r.scheduledFor))}`
                            : ""
                        }`}
                        className="flex items-center gap-1.5 rounded-xs border border-bs-border bg-bs-surface-2 px-1.5 py-1 text-left transition-colors hover:bg-bs-surface"
                      >
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-pill",
                            CHANNEL_DOT[r.channel],
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-xs leading-tight text-bs-text">
                          {r.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 ? (
        <div className="rounded-md border border-bs-border bg-bs-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-eyebrow uppercase text-bs-subtle">
              Unscheduled
            </span>
            <span className="text-xs tabular-nums text-bs-subtle">
              {unscheduled.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unscheduled.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r)}
                title={`${r.title} · ${CHANNEL_LABEL[r.channel]}`}
                className="flex max-w-full items-center gap-1.5 rounded-xs border border-bs-border bg-bs-surface-2 px-2 py-1 text-left transition-colors hover:bg-bs-surface"
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-pill",
                    CHANNEL_DOT[r.channel],
                  )}
                  aria-hidden
                />
                <span className="truncate text-xs leading-tight text-bs-text">
                  {r.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
