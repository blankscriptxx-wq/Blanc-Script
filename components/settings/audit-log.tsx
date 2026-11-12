import * as React from "react";
import type { ActivityRow } from "@/lib/data/audit";

const dtf = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Read-only timeline of recent workspace activity. */
export function AuditLog({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-dashed border-bs-border px-4 py-6 text-center text-sm text-bs-subtle">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="mt-4 space-y-0">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-start gap-3 border-l border-bs-border py-2.5 pl-4"
        >
          <span
            aria-hidden
            className="mt-1.5 -ml-[1.3125rem] h-2 w-2 shrink-0 rounded-full bg-bs-border-strong"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-bs-text">{row.label}</p>
            <p className="mt-0.5 text-xs text-bs-subtle">
              {row.actorName ?? "System"} · {dtf.format(row.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
