import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyPanel } from "@/components/auth/verify-panel";
import { signOutAction } from "@/app/(os)/auth/sign-out/actions";
import { getSecurityState, hasSecondFactor, isSecondFactorVerified } from "@/lib/auth/mfa";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm it's you", robots: { index: false, follow: false } };

/** The second sign-in step, asked once per device (and again after signing out). */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const state = await getSecurityState(user.id);
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : user.hasAccess ? "/today" : "/portal";
  if (!hasSecondFactor(state)) redirect(user.hasAccess ? "/auth/security?setup=1" : dest);
  if (await isSecondFactorVerified(user.id)) redirect(dest);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bs-canvas px-4 py-10 text-bs-text">
      <div className="w-full max-w-sm">
        <p className="font-display text-lg font-extrabold uppercase leading-none tracking-tight">
          Blanc<span className="text-bs-primary">Script</span>
          <span className="text-bs-accent">.</span>
        </p>
        <h1 className="mt-8 font-display text-h1">Confirm it&rsquo;s you</h1>
        <p className="mb-6 mt-1 text-sm text-bs-muted">
          One more step to sign in as {user.email}. You won&rsquo;t be asked again on this device for a week.
        </p>
        <VerifyPanel hasTotp={state.totp} hasPasskey={state.passkeys.length > 0} next={dest} />
        <form action={signOutAction} className="mt-6 text-center">
          <button className="text-xs text-bs-subtle underline-offset-2 hover:text-bs-text hover:underline">Sign out</button>
        </form>
      </div>
    </div>
  );
}
