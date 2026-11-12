import type { Metadata } from "next";
import Link from "next/link";
import { resolvePortalAccess } from "@/lib/data/portal";
import { portalSignOutAction } from "@/app/(os)/portal/auth-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · Blanc Script" },
  robots: { index: false, follow: false },
  // A private link: don't leak it to other sites through the Referer header.
  referrer: "no-referrer",
};

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await resolvePortalAccess(token);
  // Not signed in / not set up yet: the page itself sends them to /portal/enter.
  if (access.state !== "ok") return <>{children}</>;
  const ctx = access.ctx;

  return (
    <div className="min-h-dvh bg-bs-canvas text-bs-text">
      <header className="border-b border-bs-border bg-bs-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href={`/portal/${token}`}
            className="font-display text-lg font-extrabold uppercase leading-none tracking-tight"
          >
            Blanc<span className="text-bs-primary">Script</span>
            <span className="text-bs-accent">.</span>
          </Link>
          <span className="ml-auto text-right text-sm">
            <span className="block font-medium text-bs-text">{ctx.clientName}</span>
            <span className="block text-xs text-bs-subtle">Signed in as {ctx.viewerName}</span>
          </span>
          {ctx.login ? (
            <form action={portalSignOutAction}>
              <button className="text-xs text-bs-subtle underline-offset-2 hover:text-bs-text hover:underline">
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-10 text-xs text-bs-subtle sm:px-6">
        This is a private link for {ctx.clientName}. Please don&rsquo;t forward it.
      </footer>
    </div>
  );
}
