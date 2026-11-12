"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";
import { emailBodyAction, resendEmailAction } from "@/app/(os)/(app)/settings/emails/actions";

export type EmailRowView = {
  id: string;
  toEmail: string;
  subject: string;
  kindLabel: string;
  status: "sent" | "failed" | "not_configured" | "queued";
  error: string | null;
  when: string;
};

const STATUS: Record<EmailRowView["status"], { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "bg-bs-success-soft text-bs-success" },
  failed: { label: "Failed", cls: "bg-bs-danger-soft text-bs-danger" },
  not_configured: { label: "Not sent", cls: "bg-bs-surface-2 text-bs-muted" },
  queued: { label: "Not sent", cls: "bg-bs-surface-2 text-bs-muted" },
};

/** One email in the log: who, what, whether it went — with its text and a resend. */
export function EmailLogRow({ row }: { row: EmailRowView }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const s = STATUS[row.status];

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`rounded-pill px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
          onClick={async () => {
            setOpen((o) => !o);
            if (body === null) setBody(await emailBodyAction(row.id).catch(() => "Could not load this email."));
          }}
        >
          <span className="block truncate text-sm font-medium text-bs-text">{row.subject}</span>
          <span className="block truncate text-xs text-bs-subtle">
            To {row.toEmail} · {row.kindLabel} · {row.when}
          </span>
        </button>
        {row.status !== "sent" ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(`Send this email to ${row.toEmail} now?`)) return;
              setBusy(true);
              setNote(null);
              const res = await resendEmailAction(row.id).catch(() => null);
              setBusy(false);
              setNote(res ? { ok: res.ok, text: res.ok ? res.message : res.error } : { ok: false, text: "Something went wrong." });
              router.refresh();
            }}
            className="inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            Send now
          </button>
        ) : null}
      </div>
      {row.status === "failed" && row.error ? <p className="mt-1 text-xs text-bs-danger">Why it failed: {row.error}</p> : null}
      {note ? <p className={`mt-1 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
      {open ? (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-sm border border-bs-border bg-bs-surface-2 p-3 font-sans text-xs leading-relaxed text-bs-text">
          {body ?? "Loading…"}
        </pre>
      ) : null}
    </li>
  );
}
