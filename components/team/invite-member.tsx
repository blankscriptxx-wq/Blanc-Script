"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, Minus } from "lucide-react";
import { cancelInviteAction, inviteMemberAction } from "@/app/(os)/(app)/team/actions";
import { INTERNAL_ROLES, type InternalRole } from "@/lib/auth/roles";
import { ROLE_INFO } from "@/lib/auth/role-info";

/**
 * Invite someone to the team: pick the role template that fits them, enter
 * their email, and they get a branded invitation. Their access is ready the
 * moment they sign up with that email.
 */
export function InviteMember({
  pending,
  canInviteOwner,
}: {
  pending: { email: string; role: InternalRole }[];
  canInviteOwner: boolean;
}) {
  const router = useRouter();
  const roles = INTERNAL_ROLES.filter((r) => r !== "owner" || canInviteOwner);
  const [role, setRole] = React.useState<InternalRole>("editor");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function run(key: string, fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    setNote(res ? { ok: res.ok, text: res.ok ? res.message : res.error } : { ok: false, text: "Something went wrong." });
    router.refresh();
    return Boolean(res?.ok);
  }

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <section className="mt-8">
      <h2 className="font-display text-h3 text-bs-text">Invite a team member</h2>
      <p className="mb-3 mt-1 text-sm text-bs-muted">
        Choose the role that fits them. They get a Blanc Script email with a sign-up link, choose their own password
        and land in the workspace with that role&rsquo;s access. You can fine-tune anyone&rsquo;s permissions above
        afterwards.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Role">
        {roles.map((r) => {
          const info = ROLE_INFO[r];
          const on = role === r;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRole(r)}
              className={`rounded-md border p-4 text-left transition-colors ${on ? "border-bs-primary bg-bs-surface-2 ring-1 ring-bs-primary" : "border-bs-border bg-bs-surface hover:bg-bs-surface-2"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-h3 text-bs-text">{info.label}</span>
                {on ? <span className="rounded-pill bg-bs-primary px-2 py-0.5 text-xs font-medium text-bs-on-accent">Selected</span> : null}
              </span>
              <span className="mt-1 block text-xs text-bs-muted">{info.forWho}</span>
              <ul className="mt-3 space-y-1">
                {info.can.map((c) => (
                  <li key={c} className="flex gap-1.5 text-xs text-bs-text">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-bs-success" /> {c}
                  </li>
                ))}
                {info.cannot.map((c) => (
                  <li key={c} className="flex gap-1.5 text-xs text-bs-subtle">
                    <Minus className="mt-0.5 h-3 w-3 shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.trim()) return;
          if (await run("send", () => inviteMemberAction(email, role))) setEmail("");
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email of the person to invite"
          className="h-9 min-w-[220px] flex-1 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
        />
        <button
          type="submit"
          disabled={busy !== "" || !email.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
        >
          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Invite as {ROLE_INFO[role].label.toLowerCase()}
        </button>
      </form>
      {note ? <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}

      {pending.length ? (
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-bs-muted">Invited — not signed up yet</p>
          <ul className="space-y-2">
            {pending.map((p) => (
              <li key={p.email} className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-bs-text">{p.email}</span>
                  <span className="block text-xs text-bs-subtle">{ROLE_INFO[p.role]?.label ?? p.role}</span>
                </span>
                <button type="button" className={btn} disabled={busy !== ""} onClick={() => run(`re-${p.email}`, () => inviteMemberAction(p.email, p.role))}>
                  {busy === `re-${p.email}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Resend
                </button>
                <button
                  type="button"
                  disabled={busy !== ""}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                  onClick={() => {
                    if (window.confirm(`Withdraw the invitation for ${p.email}?`)) void run(`x-${p.email}`, () => cancelInviteAction(p.email));
                  }}
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
