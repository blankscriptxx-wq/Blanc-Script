"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { inviteOwnerAction } from "@/app/(os)/(app)/team/actions";

/** Invite another owner by email: reserves their access and sends a branded sign-up invitation. */
export function InviteOwner({ reserved }: { reserved: string[] }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function send(to: string) {
    setBusy(to);
    setNote(null);
    const res = await inviteOwnerAction(to).catch(() => null);
    setBusy("");
    setNote(res ? { ok: res.ok, text: res.ok ? res.message : res.error } : { ok: false, text: "Something went wrong." });
    if (res?.ok) setEmail("");
    router.refresh();
  }

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <section className="mt-8">
      <h2 className="font-display text-h3 text-bs-text">Invite an owner</h2>
      <p className="mb-3 mt-1 text-sm text-bs-muted">
        They get a Blanc Script email with a sign-up link, choose their own password and land straight in the
        workspace as an owner.
      </p>
      {reserved.length ? (
        <ul className="mb-3 space-y-2">
          {reserved.map((r) => (
            <li key={r} className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-2.5">
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-bs-text">{r}</span>
                <span className="block text-xs text-bs-subtle">Owner access reserved — hasn&rsquo;t signed up yet</span>
              </span>
              <button type="button" className={btn} disabled={busy !== ""} onClick={() => send(r)}>
                {busy === r ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email invitation
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) void send(email);
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email of the owner to invite"
          className="h-9 min-w-[220px] flex-1 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
        />
        <button type="submit" className={btn} disabled={busy !== "" || !email.trim()}>
          {busy === email && email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send invitation
        </button>
      </form>
      {note ? <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
    </section>
  );
}
