import "server-only";
import { and, count, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clients,
  contentItems,
  deliverables,
  invoices,
  projects,
  scripts,
  shoots,
  talent,
  tasks,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { invoiceGrossPence } from "@/lib/data/finance";

/**
 * Insights — an at-a-glance, org-wide analytics read. EVERY query is scoped to
 * the caller's org_id via `requireUser()` and is strictly read-only. Money
 * figures are gated behind the `can_see_money` capability. British English and
 * GBP integer-pence throughout; formatting happens in the view layer.
 */

export type ClientStatus = "lead" | "active" | "paused" | "churned";
export type ContentStatus =
  | "idea"
  | "scripting"
  | "filming"
  | "editing"
  | "scheduled"
  | "posted";
export type DeliverableStatus =
  | "editing"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published";
export type ShootStatus = "booked" | "on_site" | "wrapped" | "cancelled";
export type ScriptStatus = "idea" | "draft" | "review" | "approved" | "produced";

export type Breakdown<K extends string> = { key: K; count: number }[];

export type InsightsFinance = {
  outstandingPence: number;
  paidThisMonthPence: number;
  overdueCount: number;
  invoiceCount: number;
};

export type ActivityPoint = { day: string; count: number };

export type Insights = {
  headline: {
    clients: number;
    activeProjects: number;
    upcomingShoots: number;
    openTasks: number;
  };
  pipeline: {
    clientsByStatus: Breakdown<ClientStatus>;
    contentByStatus: Breakdown<ContentStatus>;
    deliverablesByStatus: Breakdown<DeliverableStatus>;
  };
  production: {
    shootsByStatus: Breakdown<ShootStatus>;
    talentCount: number;
    scriptsByStatus: Breakdown<ScriptStatus>;
    scriptsCount: number;
  };
  /** Present only when the caller may see money. */
  finance: InsightsFinance | null;
  activity: ActivityPoint[];
};

const CLIENT_STATUSES: ClientStatus[] = ["lead", "active", "paused", "churned"];
const CONTENT_STATUSES: ContentStatus[] = [
  "idea",
  "scripting",
  "filming",
  "editing",
  "scheduled",
  "posted",
];
const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "editing",
  "in_review",
  "changes_requested",
  "approved",
  "published",
];
const SHOOT_STATUSES: ShootStatus[] = ["booked", "on_site", "wrapped", "cancelled"];
const SCRIPT_STATUSES: ScriptStatus[] = [
  "idea",
  "draft",
  "review",
  "approved",
  "produced",
];

const ACTIVITY_DAYS = 14;

/** Zero-fill a grouped `{ status, value }` result into a fixed, ordered list. */
function toBreakdown<K extends string>(
  order: readonly K[],
  rows: { status: string | null; value: number }[],
): Breakdown<K> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.status != null) map.set(r.status, Number(r.value));
  }
  return order.map((key) => ({ key, count: map.get(key) ?? 0 }));
}

/** The YYYY-MM-DD label of a timestamp in the agency's timezone. */
function londonDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/London",
  }).format(d);
}

export async function getInsights(): Promise<Insights> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();
  const canSeeMoney = user.capabilities.has("can_see_money");

  const now = new Date();
  const in14d = new Date(now.getTime() + ACTIVITY_DAYS * 86_400_000);
  const activitySince = new Date(now.getTime() - (ACTIVITY_DAYS - 1) * 86_400_000);

  const dayExpr = sql<string>`to_char((${activityLog.createdAt} AT TIME ZONE 'Europe/London')::date, 'YYYY-MM-DD')`;

  const [
    clientsByStatus,
    activeProjectsRow,
    upcomingShootsRow,
    openTasksRow,
    contentByStatus,
    deliverablesByStatus,
    shootsByStatus,
    talentRow,
    scriptsByStatus,
    activityRows,
  ] = await Promise.all([
    // Clients by lifecycle status (non-archived).
    db
      .select({ status: clients.status, value: count() })
      .from(clients)
      .where(and(eq(clients.orgId, org), isNull(clients.archivedAt)))
      .groupBy(clients.status),
    // Active projects (planning / active).
    db
      .select({ value: count() })
      .from(projects)
      .where(
        and(
          eq(projects.orgId, org),
          isNull(projects.archivedAt),
          inArray(projects.status, ["planning", "active"]),
        ),
      ),
    // Shoots scheduled within the next 14 days (booked / on site).
    db
      .select({ value: count() })
      .from(shoots)
      .where(
        and(
          eq(shoots.orgId, org),
          isNull(shoots.archivedAt),
          inArray(shoots.status, ["booked", "on_site"]),
          gte(shoots.scheduledAt, now),
          lte(shoots.scheduledAt, in14d),
        ),
      ),
    // Open tasks (anything not done).
    db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(eq(tasks.orgId, org), isNull(tasks.archivedAt), ne(tasks.status, "done")),
      ),
    // Content pipeline by status.
    db
      .select({ status: contentItems.status, value: count() })
      .from(contentItems)
      .where(and(eq(contentItems.orgId, org), isNull(contentItems.archivedAt)))
      .groupBy(contentItems.status),
    // Deliverables by status.
    db
      .select({ status: deliverables.status, value: count() })
      .from(deliverables)
      .where(and(eq(deliverables.orgId, org), isNull(deliverables.archivedAt)))
      .groupBy(deliverables.status),
    // Shoots by status (all non-archived).
    db
      .select({ status: shoots.status, value: count() })
      .from(shoots)
      .where(and(eq(shoots.orgId, org), isNull(shoots.archivedAt)))
      .groupBy(shoots.status),
    // Talent on the books (non-archived, active-or-inactive).
    db
      .select({ value: count() })
      .from(talent)
      .where(and(eq(talent.orgId, org), isNull(talent.archivedAt))),
    // Scripts by status.
    db
      .select({ status: scripts.status, value: count() })
      .from(scripts)
      .where(and(eq(scripts.orgId, org), isNull(scripts.archivedAt)))
      .groupBy(scripts.status),
    // Activity volume per day over the last 14 days.
    db
      .select({ day: dayExpr, value: count() })
      .from(activityLog)
      .where(
        and(eq(activityLog.orgId, org), gte(activityLog.createdAt, activitySince)),
      )
      .groupBy(dayExpr),
  ]);

  // Finance (gated). Kept as its own aggregate so the whole thing stays a
  // handful of queries, and is skipped entirely without the capability.
  let finance: InsightsFinance | null = null;
  if (canSeeMoney) {
    const [agg] = await db
      .select({
        outstandingPence: sql<number>`coalesce(sum(${invoiceGrossPence}) filter (where ${invoices.status} in ('sent','approved','overdue')), 0)`,
        paidThisMonthPence: sql<number>`coalesce(sum(${invoiceGrossPence}) filter (where ${invoices.status} = 'paid' and ${invoices.paidAt} >= date_trunc('month', now())), 0)`,
        overdueCount: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')`,
        invoiceCount: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(and(eq(invoices.orgId, org), isNull(invoices.archivedAt)));
    finance = {
      outstandingPence: Number(agg?.outstandingPence ?? 0),
      paidThisMonthPence: Number(agg?.paidThisMonthPence ?? 0),
      overdueCount: Number(agg?.overdueCount ?? 0),
      invoiceCount: Number(agg?.invoiceCount ?? 0),
    };
  }

  // Build a dense 14-day activity series (oldest → newest), zero-filling gaps.
  const activityMap = new Map<string, number>();
  for (const r of activityRows) {
    if (r.day) activityMap.set(r.day, Number(r.value));
  }
  const activity: ActivityPoint[] = [];
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = londonDayKey(d);
    activity.push({ day: key, count: activityMap.get(key) ?? 0 });
  }

  const clientsBreakdown = toBreakdown<ClientStatus>(CLIENT_STATUSES, clientsByStatus);
  const totalClients = clientsBreakdown.reduce((sum, b) => sum + b.count, 0);
  const scriptsBreakdown = toBreakdown<ScriptStatus>(SCRIPT_STATUSES, scriptsByStatus);
  const scriptsCount = scriptsBreakdown.reduce((sum, b) => sum + b.count, 0);

  return {
    headline: {
      clients: totalClients,
      activeProjects: Number(activeProjectsRow[0]?.value ?? 0),
      upcomingShoots: Number(upcomingShootsRow[0]?.value ?? 0),
      openTasks: Number(openTasksRow[0]?.value ?? 0),
    },
    pipeline: {
      clientsByStatus: clientsBreakdown,
      contentByStatus: toBreakdown<ContentStatus>(CONTENT_STATUSES, contentByStatus),
      deliverablesByStatus: toBreakdown<DeliverableStatus>(
        DELIVERABLE_STATUSES,
        deliverablesByStatus,
      ),
    },
    production: {
      shootsByStatus: toBreakdown<ShootStatus>(SHOOT_STATUSES, shootsByStatus),
      talentCount: Number(talentRow[0]?.value ?? 0),
      scriptsByStatus: scriptsBreakdown,
      scriptsCount,
    },
    finance,
    activity,
  };
}
