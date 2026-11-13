import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { NewMenu } from "@/components/today/new-menu";
import { StatusPill } from "@/components/ds/status-pill";
import { CountUp, PulseDot, Reveal } from "@/components/ds/motion";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { servicePlans } from "@/lib/db/schema";
import { getDashboard, getTodayStats } from "@/lib/data/today";
import {
  getNeedsYou,
  getRecentActivity,
  type NeedsYouItem,
  type NeedsYouKind,
  type NeedsYouTone,
} from "@/lib/data/today-feed";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const card = "min-w-0 rounded-md border border-bs-border bg-bs-surface";
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

/** Needs-you groups, in the order they should be dealt with. */
const GROUPS: { kind: NeedsYouKind; label: string; href: string; all: string }[] = [
  { kind: "invoice", label: "Invoices to chase", href: "/finance", all: "Open finance" },
  { kind: "client", label: "Clients to set up", href: "/clients", all: "Open clients" },
  { kind: "shoot", label: "Shoots this week", href: "/shoots", all: "Open shoots" },
  { kind: "deliverable", label: "Edits to review", href: "/edits", all: "Open edits" },
  { kind: "task", label: "Tasks due", href: "/projects", all: "Open projects" },
];
const SHOWN = 4;
const toneRank: Record<NeedsYouTone, number> = { danger: 0, warning: 1, accent: 2, success: 3 };

function Bars({ rows }: { rows: { label: string; value: number; tone?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 text-bs-muted">{r.label}</span>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bs-surface-2">
            <span
              className={"block h-full rounded-full " + (r.tone ?? "bg-bs-accent")}
              style={{ width: `${r.value ? Math.max(6, (r.value / max) * 100) : 0}%` }}
            />
          </span>
          <span className="w-6 shrink-0 text-right font-medium tabular-nums text-bs-text">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function CardHead({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-h3 text-bs-text">{title}</h2>
      <Link href={href} className="shrink-0 text-xs text-bs-muted hover:text-bs-text">
        {link} →
      </Link>
    </div>
  );
}

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());

  const [plans, stats, dash, needsYou, activity] = await Promise.all([
    user.orgId
      ? getDb()
          .select()
          .from(servicePlans)
          // Removed (archived) packages stay out of the list.
          .where(and(eq(servicePlans.orgId, user.orgId), isNull(servicePlans.archivedAt)))
          .orderBy(asc(servicePlans.sortOrder))
      : Promise.resolve([]),
    getTodayStats(),
    getDashboard(),
    getNeedsYou(),
    getRecentActivity(),
  ]);

  const kpis: { label: string; value: number; hint: string; href: string; money?: boolean; alert?: boolean }[] = [
    { label: "Clients", value: stats.clients, hint: `${dash.pipeline.active} active`, href: "/clients" },
    { label: "Active projects", value: stats.activeProjects, hint: "In delivery", href: "/projects" },
    { label: "Upcoming shoots", value: stats.upcomingShoots, hint: "Booked / on site", href: "/shoots" },
    {
      label: "Open tasks",
      value: stats.openTasks,
      hint: dash.tasks.overdue ? `${dash.tasks.overdue} overdue` : `${dash.tasks.dueThisWeek} due this week`,
      href: "/projects",
      alert: dash.tasks.overdue > 0,
    },
  ];
  if (dash.money) {
    kpis.push(
      {
        label: "Outstanding",
        value: dash.money.outstandingPence / 100,
        hint: dash.money.overdueCount ? `${dash.money.overdueCount} overdue` : "Nothing overdue",
        href: "/finance",
        money: true,
        alert: dash.money.overdueCount > 0,
      },
      { label: "Paid this month", value: dash.money.paidThisMonthPence / 100, hint: "Received", href: "/finance", money: true },
    );
  }

  const groups = GROUPS.map((g) => {
    const items = needsYou.items.filter((i) => i.kind === g.kind);
    const urgent = items.filter((i) => i.tone === "danger").length;
    const tone: NeedsYouTone = items.reduce<NeedsYouTone>((t, i) => (toneRank[i.tone] < toneRank[t] ? i.tone : t), "success");
    return { ...g, items, urgent, tone };
  }).filter((g) => g.items.length > 0);
  // Open the first group that has something urgent, or simply the first.
  const openKind = (groups.find((g) => g.urgent > 0) ?? groups[0])?.kind;
  const total = needsYou.items.length;

  const shoot = dash.shoots[0];
  const shootWhen = shoot?.scheduledAt
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Europe/London",
      }).format(shoot.scheduledAt)
    : "Date to be confirmed";
  const shortWhen = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" }).format(d)
      : "No date";

  const row = (item: NeedsYouItem) => (
    <li key={item.id}>
      <Link
        href={item.href}
        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bs-surface-2"
      >
        <PulseDot tone={item.tone} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 break-words text-sm font-medium text-bs-text">{item.title}</span>
          <span className="line-clamp-1 break-words text-xs text-bs-muted">{item.meta}</span>
        </span>
        <span aria-hidden className="shrink-0 text-bs-subtle">
          →
        </span>
      </Link>
    </li>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={today}
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        actions={<NewMenu canSeeMoney={user.capabilities.has("can_see_money")} />}
      />

      {/* Headline numbers */}
      <div className={"grid grid-cols-2 gap-3 sm:grid-cols-3 " + (dash.money ? "lg:grid-cols-6" : "lg:grid-cols-4")}>
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.04} className="min-w-0">
            <Link href={k.href} className={card + " block h-full p-4 transition-colors hover:border-bs-border-strong"}>
              <div className="truncate text-eyebrow uppercase text-bs-subtle">{k.label}</div>
              <div className="mt-1 truncate font-display text-h1 text-bs-text">
                {k.money ? gbp.format(k.value) : <CountUp value={k.value} />}
              </div>
              <div className={"mt-1 truncate text-xs " + (k.alert ? "font-medium text-bs-danger" : "text-bs-muted")}>{k.hint}</div>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Needs you — grouped by what it is */}
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-h2">Needs you</h2>
            {total > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-bs-subtle">
                <PulseDot tone="danger" /> {total} to action
              </span>
            ) : null}
          </div>

          {groups.length === 0 ? (
            <EmptyState
              title="Nothing needs you right now."
              description="Overdue invoices, clients to set up, shoots this week, edits to review and tasks due will gather here, grouped."
            />
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <details key={g.kind} open={g.kind === openKind} className={card + " group overflow-hidden"}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <PulseDot tone={g.tone} />
                    <span className="min-w-0 flex-1 truncate font-medium text-bs-text">{g.label}</span>
                    {g.urgent > 0 ? (
                      <StatusPill tone="danger" className="shrink-0">
                        {g.urgent} overdue
                      </StatusPill>
                    ) : null}
                    <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-bs-surface-2 px-2 text-xs font-semibold tabular-nums text-bs-text">
                      {g.items.length}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-bs-subtle transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="divide-y divide-bs-border border-t border-bs-border">{g.items.slice(0, SHOWN).map(row)}</ul>
                  {g.items.length > SHOWN ? (
                    <Link
                      href={g.href}
                      className="block border-t border-bs-border px-4 py-2.5 text-xs font-medium text-bs-muted hover:bg-bs-surface-2 hover:text-bs-text"
                    >
                      + {g.items.length - SHOWN} more · {g.all} →
                    </Link>
                  ) : null}
                </details>
              ))}
            </div>
          )}
        </section>

        {/* Next shoot + client pipeline */}
        <div className="min-w-0 space-y-6">
          <section className={card + " p-5"}>
            <CardHead title="Next shoot" href="/shoots" link="All shoots" />
            {shoot ? (
              <>
                <p className="mt-3 text-eyebrow uppercase text-bs-accent">{shootWhen}</p>
                <p className="mt-1 break-words font-display text-h3 text-bs-text">{shoot.title}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  {[
                    ["Client", shoot.clientName],
                    ["Where", shoot.locationName],
                    ["Talent", shoot.talent],
                    ["Scripts", shoot.scripts ? `${shoot.scripts} ready` : null],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-16 shrink-0 text-bs-subtle">{k}</dt>
                        <dd className="min-w-0 break-words text-bs-text">{v}</dd>
                      </div>
                    ))}
                </dl>
                <Link
                  href={`/shoots/${shoot.id}`}
                  className="mt-4 flex h-10 items-center justify-center rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover"
                >
                  Open run sheet and scripts →
                </Link>
                {dash.shoots.length > 1 ? (
                  <ul className="mt-4 space-y-1.5 border-t border-bs-border pt-3 text-sm">
                    {dash.shoots.slice(1).map((s) => (
                      <li key={s.id} className="flex gap-3">
                        <span className="w-24 shrink-0 text-bs-subtle">{shortWhen(s.scheduledAt)}</span>
                        <span className="min-w-0 truncate text-bs-text">{s.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-bs-muted">Nothing booked. Book a shoot from the New menu.</p>
            )}
          </section>

          <section className={card + " p-5"}>
            <CardHead title="Clients" href="/clients" link="All clients" />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["To set up", dash.pipeline.toSetUp],
                ["Waiting on them", dash.pipeline.waiting],
                ["Active", dash.pipeline.active],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0 rounded-sm bg-bs-surface-2 px-2 py-3">
                  <div className="font-display text-h2 text-bs-text">{v}</div>
                  <div className="mt-0.5 text-xs text-bs-muted">{l}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Work in progress */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <section className={card + " p-5"}>
          <CardHead title="Edits" href="/edits" link="Open edits" />
          <Bars
            rows={[
              { label: "To film", value: dash.edits.toFilm, tone: "bg-bs-gold" },
              { label: "Editing", value: dash.edits.editing },
              { label: "In review", value: dash.edits.inReview, tone: "bg-bs-primary" },
              { label: "Changes", value: dash.edits.changes, tone: "bg-bs-warning" },
              { label: "Approved", value: dash.edits.approved, tone: "bg-bs-success" },
            ]}
          />
        </section>
        <section className={card + " p-5"}>
          <CardHead title="Content" href="/content" link="Open content" />
          <Bars
            rows={[
              { label: "Ideas", value: dash.content.idea },
              { label: "Scripting", value: dash.content.scripting },
              { label: "Filming", value: dash.content.filming },
              { label: "Editing", value: dash.content.editing },
              { label: "Scheduled", value: dash.content.scheduled, tone: "bg-bs-primary" },
              { label: "Posted", value: dash.content.posted, tone: "bg-bs-success" },
            ]}
          />
        </section>
        <section className={card + " p-5 md:col-span-2 lg:col-span-1"}>
          <h2 className="font-display text-h3 text-bs-text">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-bs-muted">Nothing logged yet.</p>
          ) : (
            <ol className="relative mt-4 space-y-3 border-l border-bs-border pl-4">
              {activity.slice(0, 7).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-bs-accent" />
                  <div className="break-words text-sm text-bs-text">{a.label}</div>
                  <div className="text-xs text-bs-subtle">{a.when}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Packages */}
      {plans.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-h2">Your packages</h2>
            <Link href="/settings" className="shrink-0 text-xs text-bs-muted hover:text-bs-text">
              Edit in settings →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {plans.map((p) => (
              <div key={p.id} className={card + " p-4" + (p.bespoke ? " border-t-2 border-t-bs-gold" : "")}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="min-w-0 break-words text-sm font-medium text-bs-text">{p.name}</h3>
                  {p.mostPopular ? <StatusPill tone="gold">Popular</StatusPill> : null}
                </div>
                <div className="mt-1 font-display text-h2 text-bs-text">
                  {p.bespoke || p.pricePence == null ? "Bespoke" : gbp.format(p.pricePence / 100)}
                </div>
                <div className="text-xs text-bs-subtle">{p.bespoke || p.pricePence == null ? "Priced per client" : "per month"}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
