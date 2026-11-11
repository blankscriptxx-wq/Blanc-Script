import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-bs-border bg-bs-surface",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-h3 text-bs-text", className)} {...props} />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

/** A metric tile. Pass `value` only when real data exists; otherwise it shows a
 * calm "no data yet" state rather than a fabricated number. */
export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value?: string | number | null;
  hint?: string;
  className?: string;
}) {
  const hasValue = value !== undefined && value !== null && value !== "";
  return (
    <Card className={cn("p-4", className)}>
      <div className="text-eyebrow uppercase text-bs-subtle">{label}</div>
      {hasValue ? (
        <div className="mt-1 font-display text-h1 tabular-nums text-bs-text">
          {value}
        </div>
      ) : (
        <div className="mt-1 text-sm text-bs-subtle">—</div>
      )}
      {hint ? <div className="mt-1 text-xs text-bs-muted">{hint}</div> : null}
    </Card>
  );
}
