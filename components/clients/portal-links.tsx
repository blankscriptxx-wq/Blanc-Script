"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Loader2, Mail, Plus } from "lucide-react";
import {
  createPortalLinkAction,
  resendPortalInviteAction,
  revokePortalLinkAction,
} from "@/app/(os)/(app)/clients/[id]/portal-actions";

export type PortalLinkView = {
  id: string;
  label: string;
  token: string;
  email: string | null;
  requiresLogin: boolean;
  claimed: boolean;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/**
 * Client portal access for one client. Inviting someone by email gives them a
 * login (they choose a password on first visit). Leaving the email blank makes
 * a plain private link instead.
 */
export function PortalLinks({
  clientId,
  links,
  contacts,
}: {
  clientId: string;
  links: PortalLinkView[];
  contacts: { name: string; email: string | null }[];
}) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);

  const active = links.filter((l) => !l.revokedAt);
  const unused = contacts.filter(
    (c) => !active.some((l) => l.label === c.name || (c.email && l.email === c.email.toLowerCase())),
  );

  async function run(key: string, fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) return setNote({ ok: false, text: "Something went wrong." });
    if (!res.ok) return setNote({ ok: false, text: res.error });
    if (res.message) setNote({ ok: true, text: res.message });
    router.refresh();
    return true;
  }

  async function create(name: string, mail: string) {
    const done = await run("create", () => createPortalLinkAction(clientId, name, mail));
    if (done) {
      setLabel("");
      setEmail("");
    }
  }

  const ghost =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <Globe className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Client portal</h2>
      </div>
      <p className="mb-3 text-sm text-bs-muted">
        Invite each person by email and they get their own login. In the portal they can review
        cuts, see their package and invoices, accept agreements and upload footage — nothing
        internal.
      </p>

      {active.length ? (
        <ul className="mb-3 space-y-2">
          {active.map((l) => {
            const url = `${origin}/portal/${l.token}`;
            const state = l.requiresLogin
              ? l.claimed
                ? "Login active"
                : "Invited — login not set up yet"
              : "Private link (no login)";
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-bs-text">
                    {l.label}
                    {l.email ? <span className="ml-2 font-normal text-bs-subtle">{l.email}</span> : null}
                  </span>
                  <span className="block text-xs text-bs-subtle">
                    {state} · {l.lastSeenAt ? `last opened ${day.format(new Date(l.lastSeenAt))}` : "not opened yet"}
                  </span>
                </span>
                {l.email ? (
                  <button
                    type="button"
                    className={ghost}
                    disabled={busy !== ""}
                    onClick={() => run(`mail-${l.id}`, () => resendPortalInviteAction(clientId, l.id))}
                  >
                    {busy === `mail-${l.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    Email invite
                  </button>
                ) : null}
                <button
                  type="button"
                  className={ghost}
                  onClick={() => {
                    navigator.clipboard?.writeText(url).then(
                      () => {
                        setCopied(l.id);
                        setTimeout(() => setCopied(""), 1500);
                      },
                      () => {},
                    );
                  }}
                >
                  {copied === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === l.id ? "Copied" : l.requiresLogin && !l.claimed ? "Copy invite link" : "Copy link"}
                </button>
                {!l.requiresLogin ? (
                  <a href={`/portal/${l.token}`} target="_blank" rel="noreferrer" className="text-xs text-bs-primary hover:underline">
                    Preview
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this person's portal access? It stops working straight away.")) {
                      void run(l.id, () => revokePortalLinkAction(clientId, l.id));
                    }
                  }}
                  disabled={busy !== ""}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                >
                  {busy === l.id ? "Removing…" : "Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim()) void create(label, email);
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name, e.g. Hannah Fernley"
          aria-label="Name for portal access"
          className="h-9 min-w-[180px] flex-1 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email (gives them a login)"
          aria-label="Email for portal login"
          className="h-9 min-w-[200px] flex-1 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
        />
        <button
          type="submit"
          disabled={busy !== "" || !label.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
        >
          {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {email.trim() ? "Invite" : "Create link"}
        </button>
      </form>
      {unused.length ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-bs-subtle">
          Invite a contact:
          {unused.map((c) => (
            <button
              key={c.name}
              type="button"
              disabled={busy !== ""}
              onClick={() => create(c.name, c.email ?? "")}
              title={c.email ? `Invite ${c.email}` : "No email on file — creates a private link"}
              className="rounded-pill border border-bs-border px-2 py-0.5 text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
            >
              {c.name}
            </button>
          ))}
        </p>
      ) : null}
      {note ? (
        <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
      ) : null}
    </section>
  );
}
