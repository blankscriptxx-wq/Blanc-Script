import * as React from "react";
import { cn } from "@/lib/cn";
import { ThemeSwitcher } from "@/components/ds/theme-switcher";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bs-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-sm bg-bs-primary text-bs-on-accent">
            <span className="font-display text-base font-bold">B</span>
          </div>
          <span className="font-display text-h2 font-semibold text-bs-text">
            Blanc Script OS
          </span>
          <div className="ml-auto">
            <ThemeSwitcher size="sm" />
          </div>
        </div>
        <div className="rounded-lg border border-bs-border bg-bs-surface p-6 shadow-elev-2">
          <h1 className="font-display text-h1 text-bs-text">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-bs-muted">{subtitle}</p>
          ) : null}
          <div className="mt-5">{children}</div>
        </div>
        {footer ? (
          <p className="mt-4 text-center text-sm text-bs-muted">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-bs-text">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle",
        )}
      />
    </div>
  );
}
