"use client";
import * as React from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { AiText } from "@/components/ai/markdown";

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Reusable "draft with AI" control. The parent supplies a thunk that calls a
 * server action (so it can close over the relevant ids/context). On success it
 * either hands the text to `onResult` (e.g. to fill a field) or shows it inline
 * with a Copy button.
 */
export function AiGenerate({
  action,
  label = "Draft with AI",
  onResult,
  className,
}: {
  action: () => Promise<AiResult>;
  label?: string;
  onResult?: (text: string) => void;
  className?: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [result, setResult] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  async function run() {
    setPending(true);
    setError("");
    setResult("");
    try {
      const res = await action();
      if (res.ok) {
        if (onResult) onResult(res.text);
        else setResult(res.text);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-bs-primary" />
        )}
        {pending ? "Drafting…" : label}
      </button>
      {error ? <p className="text-xs text-bs-danger">{error}</p> : null}
      {result ? (
        <div className="rounded-sm border border-bs-border bg-bs-surface-2 p-3">
          <AiText text={result} className="text-sm text-bs-text" />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(result).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                },
                () => {},
              );
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs text-bs-subtle transition-colors hover:text-bs-text"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
