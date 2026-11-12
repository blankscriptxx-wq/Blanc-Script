import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalShell, PortalSignInForm } from "@/components/portal/auth-forms";
import { portalHomeForSession } from "@/lib/data/portal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client portal", robots: { index: false, follow: false } };

/** studio.blancscript.com/portal — clients sign in here. */
export default async function PortalSignInPage() {
  const home = await portalHomeForSession();
  if (home) redirect(home);
  return (
    <PortalShell title="Client portal" intro="Sign in to review your work, see your package and invoices, and send us files.">
      <PortalSignInForm />
      <p className="mt-4 text-xs text-bs-subtle">
        First time here? Use the invite link we sent you to create your login.
      </p>
    </PortalShell>
  );
}
