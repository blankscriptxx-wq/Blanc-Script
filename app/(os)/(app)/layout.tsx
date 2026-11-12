import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { NAV, SETTINGS_ITEM } from "@/lib/nav";
import { signOutAction } from "@/app/(os)/auth/sign-out/actions";
import { portalHomeForSession } from "@/lib/data/portal";
import { secondFactorGate } from "@/lib/auth/mfa";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  if (!user.hasAccess) {
    // Client portal logins belong in their portal, not the staff workspace.
    const portal = await portalHomeForSession();
    if (portal) redirect(portal);
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bs-canvas px-6 text-center text-bs-text">
        {/* Re-check every few seconds, so access granted a moment later opens the studio by itself. */}
        <meta httpEquiv="refresh" content="5" />
        <p className="font-serif text-h1 italic">You're signed in.</p>
        <p className="mt-2 max-w-md text-sm text-bs-muted">
          Your account (<span className="font-medium">{user.email}</span>) isn't
          linked to a workspace yet. An owner needs to grant you access before the
          dashboard opens. This page checks again by itself every few seconds.
        </p>
        <form action={signOutAction} className="mt-6">
          <button className="text-sm text-bs-primary hover:underline">Sign out</button>
        </form>
      </div>
    );
  }

  // The team must have a second sign-in step, and pass it on each device.
  const gate = await secondFactorGate(user.id, true);
  if (gate === "setup") redirect("/auth/security?setup=1");
  if (gate === "verify") redirect("/auth/verify");

  const allowedHrefs = [...NAV, SETTINGS_ITEM]
    .filter((i) => !i.requires || user.capabilities.has(i.requires))
    .map((i) => i.href);

  return (
    <AppShell
      user={{
        name: user.name,
        orgName: user.orgName ?? "",
        role: user.role ?? "",
        placeholder: false,
      }}
      allowedHrefs={allowedHrefs}
    >
      {children}
    </AppShell>
  );
}
