import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalClaimForm, PortalShell, PortalSignInForm } from "@/components/portal/auth-forms";
import { resolvePortalAccess } from "@/lib/data/portal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Where a portal address sends you when you still need to set up or sign in. */
export default async function PortalEnterPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t = "" } = await searchParams;
  const access = await resolvePortalAccess(t);
  if (access.state === "ok") redirect(`/portal/${t}`);

  if (access.state === "claim") {
    return (
      <PortalShell
        title={`Welcome to your ${access.clientName} portal`}
        intro="Your details are already filled in. Add a contact number and choose a password to create your login."
      >
        <PortalClaimForm token={t} email={access.email} name={access.label} />
      </PortalShell>
    );
  }
  if (access.state === "signin") {
    return (
      <PortalShell title="Sign in" intro={`Sign in to open the ${access.clientName} portal.`}>
        <PortalSignInForm email={access.email} />
      </PortalShell>
    );
  }
  return (
    <PortalShell
      title="This link isn't active"
      intro="It may have been replaced or switched off. Please ask Blanc Script for a new invite, or sign in below."
    >
      <PortalSignInForm />
    </PortalShell>
  );
}
