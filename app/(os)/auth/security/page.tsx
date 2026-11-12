import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SecurityPanel } from "@/components/auth/security-panel";
import { signOutAction } from "@/app/(os)/auth/sign-out/actions";
import { getSecurityState, hasSecondFactor, isSecondFactorVerified } from "@/lib/auth/mfa";
import { getCurrentUser } from "@/lib/auth/session";
import { portalHomeForSession } from "@/lib/data/portal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign-in security", robots: { index: false, follow: false } };

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

/** Set up and manage the second sign-in step. Required for the team, optional for clients. */
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const { setup } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const state = await getSecurityState(user.id);
  // Once you have a second step, you must pass it before you can change it.
  if (hasSecondFactor(state) && !(await isSecondFactorVerified(user.id))) redirect("/auth/verify?next=/auth/security");
  const continueHref = user.hasAccess ? "/today" : ((await portalHomeForSession().catch(() => null)) ?? "/portal");

  return (
    <div className="min-h-dvh bg-bs-canvas px-4 py-10 text-bs-text">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-lg font-extrabold uppercase leading-none tracking-tight">
          Blanc<span className="text-bs-primary">Script</span>
          <span className="text-bs-accent">.</span>
        </p>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-h1">Sign-in security</h1>
            <p className="mt-1 text-sm text-bs-muted">Signed in as {user.email}</p>
          </div>
          <form action={signOutAction}>
            <button className="text-sm text-bs-subtle underline-offset-2 hover:text-bs-text hover:underline">Sign out</button>
          </form>
        </div>
        <div className="mt-6">
          <SecurityPanel
            required={user.hasAccess}
            setup={setup === "1"}
            continueHref={continueHref}
            state={{
              totp: state.totp,
              recoveryLeft: state.recoveryLeft,
              passkeys: state.passkeys.map((p) => ({
                id: p.id,
                name: p.name,
                added: day.format(p.createdAt),
                lastUsed: p.lastUsedAt ? day.format(p.lastUsedAt) : null,
              })),
            }}
          />
        </div>
      </div>
    </div>
  );
}
