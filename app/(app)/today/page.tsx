import { asc, eq } from "drizzle-orm";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Spotlight, CountUp, PulseDot, Reveal } from "@/components/ds/motion";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { servicePlans } from "@/lib/db/schema";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const KPIS = [
  { label: "Footage due", hint: "Shoots awaiting handover" },
  { label: "My edits", hint: "Assigned to you" },
  { label: "Overdue", hint: "Invoices past due" },
  { label: "Approvals", hint: "Waiting on a client" },
];

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
        {KPIS.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.05}>
            <Spotlight className="rounded-md border border-bs-border bg-bs-surface p-4">
              <div className="text-eyebrow uppercase text-bs-subtle">{k.label}</div>
              <div className="mt-1 text-sm text-bs-subtle">—</div>
              <div className="mt-1 text-xs text-bs-muted">{k.hint}</div>
            </Spotlight>
          </Reveal>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-h2">Your packages</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-bs-subtle">
            <PulseDot tone="success" /> Live from the database · customisable per client
          </span>
        </div>
        {plans.length === 0 ? (
          <EmptyState title="No packages yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((p, i) => (
              <Reveal key={p.id} delay={0.1 + i * 0.05}>
                <Spotlight
                  className={
                    "h-full rounded-md border border-bs-border bg-bs-surface p-4" +
                    (p.bespoke ? " border-t-2 border-t-bs-gold" : "")
                  }
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="font-display text-h3 leading-tight">{p.name}</h3>
                    {p.mostPopular ? (
                      <StatusPill tone="gold">★ Popular</StatusPill>
                    ) : null}
                    {p.bespoke ? <StatusPill tone="gold">Premium</StatusPill> : null}
                  </div>
                  <div className="mt-2 font-display text-h1 text-bs-text">
                    {p.bespoke || p.pricePence == null ? (
                      "Bespoke"
                    ) : (
                      <CountUp value={p.pricePence / 100} prefix="£" />
                    )}
                  </div>
                  {!p.bespoke ? (
                    <div className="text-xs text-bs-subtle">per month · ex VAT</div>
                  ) : null}
                </Spotlight>
              </Reveal>
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
