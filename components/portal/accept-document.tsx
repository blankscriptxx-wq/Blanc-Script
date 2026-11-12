"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { portalAcceptDocumentAction } from "@/app/(os)/portal/[token]/actions";

/** The client accepts a document by typing their full name. */
export function AcceptDocument({ token, documentId, defaultName }: { token: string; documentId: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function accept() {
    setBusy(true);
    setError("");
    const res = await portalAcceptDocumentAction(token, documentId, name).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Something went wrong. Please try again.");
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-md border border-bs-border bg-bs-surface p-5">
      <h2 className="font-display text-h3">Accept this document</h2>
      <label className="mt-3 flex items-start gap-2 text-sm text-bs-text">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.currentTarget.checked)} className="mt-0.5" />
        <span>I have read this document and agree to it on behalf of my business.</span>
      </label>
      <label className="mt-3 block space-y-1.5">
        <span className="block text-sm font-medium">Type your full name to accept</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName}
          autoComplete="name"
          aria-label="Your full name"
          className="h-10 w-full max-w-sm rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-bs-text outline-none placeholder:text-bs-subtle"
        />
      </label>
      <button
        type="button"
        onClick={accept}
        disabled={busy || !agree || name.trim().length < 3}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-sm bg-bs-success px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Accept
      </button>
      <p className="mt-2 text-xs text-bs-subtle">
        We record your name, the date and time, and this exact version of the document.
      </p>
      {error ? <p className="mt-2 text-sm text-bs-danger">{error}</p> : null}
    </div>
  );
}
