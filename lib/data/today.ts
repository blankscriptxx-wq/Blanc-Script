import "server-only";
import { and, count, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { clients, projects, shoots, tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type TodayStats = {
  clients: number;
  activeProjects: number;
  upcomingShoots: number;
  openTasks: number;
};

export async function getTodayStats(): Promise<TodayStats> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();
  const [c1, c2, c3, c4] = await Promise.all([
    db
      .select({ value: count() })
      .from(clients)
      .where(and(eq(clients.orgId, org), isNull(clients.archivedAt))),
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
    db
      .select({ value: count() })
      .from(shoots)
      .where(
        and(
          eq(shoots.orgId, org),
          isNull(shoots.archivedAt),
          inArray(shoots.status, ["booked", "on_site"]),
        ),
      ),
    db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(eq(tasks.orgId, org), isNull(tasks.archivedAt), ne(tasks.status, "done")),
      ),
  ]);
  return {
    clients: Number(c1[0]?.value ?? 0),
    activeProjects: Number(c2[0]?.value ?? 0),
    upcomingShoots: Number(c3[0]?.value ?? 0),
    openTasks: Number(c4[0]?.value ?? 0),
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export type Dashboard = {
  money: { outstandingPence: number; overdueCount: number; paidThisMonthPence: number } | null;
  shoots: { id: string; title: string; clientName: string | null; scheduledAt: Date | null; locationName: string | null; talent: string | null; scripts: number }[];
  pipeline: { toSetUp: number; waiting: number; active: number };
  edits: { editing: number; inReview: number; changes: number; approved: number };
  content: { idea: number; scripting: number; filming: number; editing: number; scheduled: number; posted: number };
  tasks: { overdue: number; dueThisWeek: number };
};

/** Everything the Today dashboard shows beyond the headline counts. */
export async function getDashboard(): Promise<Dashboard> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();
  const [money, shootRows, pipe, edits, content, taskRows] = await Promise.all([
    user.capabilities.has("can_see_money")
      ? db.execute(sql`
          select
            coalesce(sum(amount_pence) filter (where status in ('sent', 'approved', 'overdue')), 0)::bigint as outstanding,
            count(*) filter (where status = 'overdue' or (status in ('sent', 'approved') and due_at < now()))::int as overdue,
            coalesce(sum(amount_pence) filter (where status = 'paid' and paid_at >= date_trunc('month', now())), 0)::bigint as paid
          from invoices where org_id = ${org} and talent_id is null and archived_at is null`)
      : null,
    db.execute(sql`
      select s.id, s.title, c.name as "clientName", s.scheduled_at as "scheduledAt", s.location_name as "locationName",
        (select string_agg(t.name, ', ') from shoot_talent st join talent t on t.id = st.talent_id where st.shoot_id = s.id) as talent,
        (select count(*)::int from scripts sc where sc.client_id = s.client_id and sc.archived_at is null and sc.status in ('approved', 'review', 'draft')) as scripts
      from shoots s left join clients c on c.id = s.client_id
      where s.org_id = ${org} and s.archived_at is null and s.status in ('booked', 'on_site') and s.scheduled_at >= now() - interval '6 hours'
      order by s.scheduled_at asc limit 3`),
    db.execute(sql`
      select
        count(*) filter (where ob is null or ob = 'draft')::int as "toSetUp",
        count(*) filter (where ob = 'sent')::int as waiting,
        count(*) filter (where ob = 'completed')::int as active
      from (select (select o.status from client_onboardings o where o.client_id = c.id and o.status <> 'cancelled' order by o.created_at desc limit 1) as ob
            from clients c where c.org_id = ${org} and c.archived_at is null) x`),
    db.execute(sql`
      select count(*) filter (where status = 'editing')::int as editing, count(*) filter (where status = 'in_review')::int as "inReview",
        count(*) filter (where status = 'changes_requested')::int as changes, count(*) filter (where status = 'approved')::int as approved
      from deliverables where org_id = ${org} and archived_at is null`),
    db.execute(sql`
      select count(*) filter (where status = 'idea')::int as idea, count(*) filter (where status = 'scripting')::int as scripting,
        count(*) filter (where status = 'filming')::int as filming, count(*) filter (where status = 'editing')::int as editing,
        count(*) filter (where status = 'scheduled')::int as scheduled, count(*) filter (where status = 'posted')::int as posted
      from content_items where org_id = ${org} and archived_at is null`),
    db.execute(sql`
      select count(*) filter (where due_at < now())::int as overdue,
        count(*) filter (where due_at >= now() and due_at < now() + interval '7 days')::int as "dueThisWeek"
      from tasks where org_id = ${org} and archived_at is null and status <> 'done'`),
  ]);
  const m = money?.rows[0] as { outstanding: string; overdue: number; paid: string } | undefined;
  return {
    money: m ? { outstandingPence: Number(m.outstanding), overdueCount: Number(m.overdue), paidThisMonthPence: Number(m.paid) } : null,
    shoots: (shootRows.rows as unknown as Dashboard["shoots"]).map((s) => ({ ...s, scheduledAt: s.scheduledAt ? new Date(s.scheduledAt) : null, scripts: Number(s.scripts) })),
    pipeline: pipe.rows[0] as Dashboard["pipeline"],
    edits: edits.rows[0] as Dashboard["edits"],
    content: content.rows[0] as Dashboard["content"],
    tasks: taskRows.rows[0] as Dashboard["tasks"],
  };
}
