import * as React from "react";
import { cn } from "@/lib/cn";

/** First-class empty state (design system §6.10): a human line, an explanation,
 * and at most one primary action. Used wherever real data isn't present yet. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-bs-border bg-bs-surface px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-serif text-h3 italic text-bs-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-bs-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
