import { asc, eq } from "drizzle-orm";
import { StatCard } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { servicePlans } from "@/lib/db/schema";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());

  const plans = user.orgId
    ? await getDb()
        .select()
        .from(servicePlans)
        .where(eq(servicePlans.orgId, user.orgId))
        .orderBy(asc(servicePlans.sortOrder))
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={today}
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        actions={<Button>+ New</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Footage due" hint="Shoots awaiting handover" />
        <StatCard label="My edits" hint="Assigned to you" />
        <StatCard label="Overdue" hint="Invoices past due" />
        <StatCard label="Approvals" hint="Waiting on a client" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-h2">Your packages</h2>
          <span className="text-xs text-bs-subtle">
            Live from the database · all customisable per client
          </span>
        </div>
        {plans.length === 0 ? (
          <EmptyState title="No packages yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className="rounded-md border border-bs-border bg-bs-surface p-4"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-h3">{p.name}</h3>
                  {p.mostPopular ? (
                    <StatusPill tone="accent">Popular</StatusPill>
                  ) : null}
                </div>
                <div className="mt-2 font-display text-h1 tabular-nums text-bs-text">
                  {p.bespoke || p.pricePence == null
                    ? "Bespoke"
                    : gbp.format(p.pricePence / 100)}
                </div>
                {!p.bespoke ? (
                  <div className="text-xs text-bs-subtle">per month · ex VAT</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

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
