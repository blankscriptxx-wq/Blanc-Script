import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { NewMenu } from "@/components/today/new-menu";
import { StatusPill } from "@/components/ds/status-pill";
import { Spotlight, CountUp, PulseDot, Reveal } from "@/components/ds/motion";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { servicePlans } from "@/lib/db/schema";
import { getTodayStats } from "@/lib/data/today";
import {
  getNeedsYou,
  getRecentActivity,
  type NeedsYouKind,
} from "@/lib/data/today-feed";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());

  const [plans, stats, needsYou, activity] = await Promise.all([
    user.orgId
      ? getDb()
          .select()
          .from(servicePlans)
          // Removed (archived) packages stay out of the list.
          .where(and(eq(servicePlans.orgId, user.orgId), isNull(servicePlans.archivedAt)))
          .orderBy(asc(servicePlans.sortOrder))
      : Promise.resolve([]),
    getTodayStats(),
    getNeedsYou(),
    getRecentActivity(),
  ]);

  const kindLabel: Record<NeedsYouKind, string> = {
    invoice: "Invoice",
    shoot: "Shoot",
    task: "Task",
    deliverable: "Edit",
  };

  const kpis = [
    { label: "Clients", value: stats.clients, hint: "On the books" },
    { label: "Active projects", value: stats.activeProjects, hint: "In delivery" },
    { label: "Upcoming shoots", value: stats.upcomingShoots, hint: "Booked / on site" },
    { label: "Open tasks", value: stats.openTasks, hint: "Still to do" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={today}
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        actions={<NewMenu canSeeMoney={user.capabilities.has("can_see_money")} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.05}>
            <Spotlight className="rounded-md border border-bs-border bg-bs-surface p-4">
              <div className="text-eyebrow uppercase text-bs-subtle">{k.label}</div>
              <div className="mt-1 font-display text-h1 text-bs-text">
                <CountUp value={k.value} />
              </div>
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-h2">Needs you</h2>
            {needsYou.items.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-bs-subtle">
                <PulseDot tone="danger" /> {needsYou.items.length} to action
              </span>
            ) : null}
          </div>

          {needsYou.items.length === 0 ? (
            <EmptyState
              title="Your day will gather here."
              description="Once records exist, the things that need you — late edits, shoots on site, overdue invoices, approvals waiting — surface on this list, most urgent first."
            />
          ) : (
            <ul className="space-y-2">
              {needsYou.items.map((item, i) => (
                <Reveal key={item.id} delay={i * 0.04}>
                  <Link href={item.href} className="block">
                    <Spotlight
                      lift
                      tilt={false}
                      className="flex items-center gap-3 rounded-md border border-bs-border bg-bs-surface p-3"
                    >
                      <PulseDot tone={item.tone} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-bs-text">
                            {item.title}
                          </span>
                          <StatusPill tone={item.tone} className="shrink-0">
                            {kindLabel[item.kind]}
                          </StatusPill>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-bs-muted">
                          {item.meta}
                        </div>
                      </div>
                      <span aria-hidden className="text-bs-subtle">
                        →
                      </span>
                    </Spotlight>
                  </Link>
                </Reveal>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-h2">Recent activity</h2>
          {activity.length === 0 ? (
            <EmptyState title="Nothing logged yet." />
          ) : (
            <ol className="relative space-y-4 border-l border-bs-border pl-4">
              {activity.map((a, i) => (
                <Reveal key={a.id} delay={i * 0.03}>
                  <li className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-bs-accent" />
                    <div className="text-sm text-bs-text">{a.label}</div>
                    <div className="text-xs text-bs-subtle">{a.when}</div>
                  </li>
                </Reveal>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
