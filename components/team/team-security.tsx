"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { resetMemberSecurityAction } from "@/app/(os)/(app)/team/actions";
import { ROLE_INFO } from "@/lib/auth/role-info";
import type { InternalRole } from "@/lib/auth/roles";

export type MemberSecurityView = {
  membershipId: string;
  name: string;
  email: string;
  role: string;
  totp: boolean;
  passkeys: number;
  isMaster: boolean;
  isSelf: boolean;
};

/** Who has their second sign-in step set up, with a reset for anyone who's locked out. */
export function TeamSecurity({ members, canReset }: { members: MemberSecurityView[]; canReset: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  return (
    <section className="mt-8">
      <h2 className="font-display text-h3 text-bs-text">Sign-in security</h2>
      <p className="mb-3 mt-1 text-sm text-bs-muted">
        Everyone on the team needs a second sign-in step — an authenticator app or a passkey — and is asked to set one
        up the first time they sign in.{" "}
        <Link href="/auth/security" className="text-bs-primary hover:underline">
          Manage mine
        </Link>
      </p>
      <ul className="divide-y divide-bs-border rounded-md border border-bs-border bg-bs-surface">
        {members.map((m) => {
          const methods = [m.totp ? "Authenticator app" : "", m.passkeys ? `${m.passkeys} passkey${m.passkeys === 1 ? "" : "s"}` : ""].filter(Boolean);
          const ok = methods.length > 0;
          return (
            <li key={m.membershipId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {ok ? <ShieldCheck className="h-4 w-4 shrink-0 text-bs-success" /> : <ShieldAlert className="h-4 w-4 shrink-0 text-bs-warning" />}
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-bs-text">
                  {m.name}
                  {m.isMaster ? <span className="ml-2 rounded-pill bg-bs-surface-2 px-2 py-0.5 text-xs font-normal text-bs-muted">Master owner</span> : null}
                </span>
                <span className="block text-xs text-bs-subtle">
                  {ROLE_INFO[m.role as InternalRole]?.label ?? m.role} · {m.email}
                </span>
              </span>
              <span className={`text-xs ${ok ? "text-bs-muted" : "text-bs-warning"}`}>{ok ? methods.join(" + ") : "Not set up yet"}</span>
              {canReset && ok && !m.isSelf && !m.isMaster ? (
                <button
                  type="button"
                  disabled={busy !== ""}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                  onClick={async () => {
                    if (!window.confirm(`Reset ${m.name}'s second sign-in step? They'll set it up again next time they sign in.`)) return;
                    setBusy(m.membershipId);
                    const res = await resetMemberSecurityAction(m.membershipId).catch(() => null);
                    setBusy("");
                    setNote(res ? { ok: res.ok, text: res.ok ? res.message : res.error } : { ok: false, text: "Something went wrong." });
                    router.refresh();
                  }}
                >
                  {busy === m.membershipId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reset"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {note ? <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
    </section>
  );
}
