import * as React from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? (
          <div className="text-eyebrow uppercase text-bs-subtle">{eyebrow}</div>
        ) : null}
        <h1 className="font-display text-display text-bs-text">{title}</h1>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Honest stub for modules that arrive in a later milestone. */
export function ModulePlaceholder({
  title,
  milestone,
}: {
  title: string;
  milestone: string;
}) {
  return (
    <div>
      <PageHeader title={title} eyebrow="Module" />
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-bs-border bg-bs-surface px-6 py-16 text-center">
        <p className="font-serif text-h2 italic text-bs-text">Arriving in {milestone}.</p>
        <p className="mt-2 max-w-md text-sm text-bs-muted">
          The {title} module is planned and specified in the project docs. The
          foundation it builds on — design system, auth, data model — is in place.
        </p>
      </div>
    </div>
  );
}
