import { StatCard } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { Button } from "@/components/ds/button";
import { getCurrentUser } from "@/lib/auth/session";
import { dbConfigured } from "@/lib/db/client";

export const metadata = { title: "Today" };

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const live = dbConfigured();
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={today}
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        actions={<Button>+ New</Button>}
      />

      {!live ? (
        <div className="mb-6 rounded-md border border-bs-border bg-bs-cream/60 px-4 py-3 text-sm text-bs-text">
          <span className="font-medium">Placeholder mode.</span> No database or auth
          provider is connected yet, so figures read “—”. Provision Neon (via the
          Vercel–Neon integration) and Clerk to bring the dashboard to life.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Footage due" hint="Shoots awaiting handover" />
        <StatCard label="My edits" hint="Assigned to you" />
        <StatCard label="Overdue" hint="Invoices past due" />
        <StatCard label="Approvals" hint="Waiting on a client" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-h2">Needs you</h2>
        <EmptyState
          title="Your day will gather here."
          description="Once records exist, the things that need you — late edits, shoots on site, overdue invoices, approvals waiting — surface on this list, newest first."
        />
      </section>
    </div>
  );
}
