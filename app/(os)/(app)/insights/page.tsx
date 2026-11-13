import { PageHeader } from "@/components/ds/page-header";
import { StatCard } from "@/components/ds/card";
import { Reveal } from "@/components/ds/motion";
import { KpiTiles, type KpiTile } from "@/components/insights/kpi-tiles";
import { BarRows, type BarTone, type BarDatum } from "@/components/insights/bar-rows";
import { SparklineBars } from "@/components/insights/sparkline-bars";
import { getCurrentUser } from "@/lib/auth/session";
import { getInsights } from "@/lib/data/insights";

export const metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const formatPence = (pence: number) => gbp.format(pence / 100);

/** "in_review" → "In review". */
const humanise = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

const CLIENT_TONES: Record<string, BarTone> = {
  lead: "info",
  active: "success",
  paused: "warning",
  churned: "neutral",
};
const CONTENT_TONES: Record<string, BarTone> = {
  idea: "neutral",
  scripting: "info",
  filming: "accent",
  editing: "primary",
  scheduled: "warning",
  posted: "success",
};
const DELIVERABLE_TONES: Record<string, BarTone> = {
  to_film: "warning",
  editing: "primary",
  in_review: "info",
  changes_requested: "warning",
  approved: "success",
  published: "accent",
};
const SHOOT_TONES: Record<string, BarTone> = {
  booked: "info",
  on_site: "warning",
  wrapped: "success",
  cancelled: "neutral",
};
const SCRIPT_TONES: Record<string, BarTone> = {
  idea: "neutral",
  draft: "info",
  review: "warning",
  approved: "success",
  produced: "accent",
};

function toBars(
  rows: { key: string; count: number }[],
  tones: Record<string, BarTone>,
): BarDatum[] {
  return rows.map((r) => ({
    label: humanise(r.key),
    value: r.count,
    tone: tones[r.key] ?? "accent",
  }));
}

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getInsights();
  const { headline, pipeline, production, finance, activity } = data;

  const kpis: KpiTile[] = [
    { label: "Clients", value: headline.clients, hint: "On the books" },
    { label: "Active projects", value: headline.activeProjects, hint: "In delivery" },
    { label: "Upcoming shoots", value: headline.upcomingShoots, hint: "Next 14 days" },
    { label: "Open tasks", value: headline.openTasks, hint: "Still to do" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Command"
        title="Insights"
      />

      <KpiTiles items={kpis} />

      {/* ── Pipeline ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-3 font-display text-h2 text-bs-text">Pipeline</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal delay={0.05}>
            <BarRows
              title="Clients by status"
              data={toBars(pipeline.clientsByStatus, CLIENT_TONES)}
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <BarRows
              title="Content pipeline"
              data={toBars(pipeline.contentByStatus, CONTENT_TONES)}
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.15}>
            <BarRows
              title="Edits by status"
              data={toBars(pipeline.deliverablesByStatus, DELIVERABLE_TONES)}
              className="h-full"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Production ───────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-3 font-display text-h2 text-bs-text">Production</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal delay={0.05}>
            <BarRows
              title="Shoots by status"
              data={toBars(production.shootsByStatus, SHOOT_TONES)}
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <BarRows
              title="Scripts by status"
              data={toBars(production.scriptsByStatus, SCRIPT_TONES)}
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.15}>
            <div className="grid h-full grid-cols-2 gap-4 lg:grid-cols-1">
              <StatCard
                label="Talent"
                value={production.talentCount}
                hint="On the books"
              />
              <StatCard
                label="Scripts"
                value={production.scriptsCount}
                hint="In the studio"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Finance (gated) ──────────────────────────────────────── */}
      {finance ? (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-h2 text-bs-text">Finance</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Reveal delay={0.05}>
              <StatCard
                label="Outstanding"
                value={formatPence(finance.outstandingPence)}
                hint="Sent, approved & overdue"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <StatCard
                label="Paid this month"
                value={formatPence(finance.paidThisMonthPence)}
                hint="Received since the 1st"
              />
            </Reveal>
            <Reveal delay={0.15}>
              <StatCard
                label="Overdue"
                value={finance.overdueCount}
                hint="Invoices to chase"
              />
            </Reveal>
            <Reveal delay={0.2}>
              <StatCard
                label="Invoices"
                value={finance.invoiceCount}
                hint="Raised in total"
              />
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── Activity ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-3 font-display text-h2 text-bs-text">Activity</h2>
        <Reveal delay={0.05}>
          <SparklineBars data={activity} />
        </Reveal>
      </section>
    </div>
  );
}
