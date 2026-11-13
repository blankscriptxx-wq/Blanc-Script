import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityLog, clientOnboardings, clients, organisations, projects, servicePlans, tasks } from "@/lib/db/schema";

/**
 * Package clients work month by month. Each month gets its own project, opened
 * automatically with the month's plan and starter tasks, so scripts, shoots and
 * edits always have a home.
 */

const london = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ...o }).format(d);
const periodOf = (d: Date) => `${london({ year: "numeric" }, d)}-${london({ month: "2-digit" }, d)}`;
const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : 0);

function monthPlan(planName: string, bespoke: boolean, f: Record<string, unknown>, agreed: string | null): string {
  const lines: string[] = [`Package: ${planName}.`];
  const videos = num(f.videos_per_week) * 4;
  const photos = num(f.photo_posts_per_week) * 4;
  const out: string[] = [];
  if (videos) out.push(`${videos} videos (${num(f.videos_per_week)} a week)`);
  if (photos) out.push(`${photos} photo posts (${num(f.photo_posts_per_week)} a week)`);
  if (out.length) lines.push(`This month: ${out.join(" and ")}${num(f.total_posts_per_month) ? ` — ${num(f.total_posts_per_month)} posts in all` : ""}.`);
  if (typeof f.shoot_visits === "string") lines.push(`Shoot visits: ${f.shoot_visits}.`);
  if (num(f.cinematic_per_quarter)) lines.push(`Cinematic pieces: ${num(f.cinematic_per_quarter)} a quarter.`);
  if (bespoke && !agreed) lines.push("Bespoke package — the month's output is whatever was agreed with the client.");
  if (agreed?.trim()) lines.push(`Agreed with the client:\n${agreed.trim()}`);
  return lines.join("\n");
}

/** Open the client's project for the month `when` falls in, unless it exists. Returns its id when created. */
export async function ensureMonthlyProject(orgId: string, clientId: string, when: Date): Promise<string | null> {
  const db = getDb();
  const [c] = await db
    .select({
      id: clients.id,
      name: clients.name,
      status: clients.status,
      planName: servicePlans.name,
      bespoke: servicePlans.bespoke,
      features: servicePlans.features,
    })
    .from(clients)
    .innerJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId), isNull(clients.archivedAt)))
    .limit(1);
  if (!c || c.status !== "active") return null;

  // One-off jobs are not monthly work.
  const [ob] = await db
    .select({ billingType: clientOnboardings.billingType, deliverables: clientOnboardings.deliverables, status: clientOnboardings.status })
    .from(clientOnboardings)
    .where(and(eq(clientOnboardings.orgId, orgId), eq(clientOnboardings.clientId, clientId), ne(clientOnboardings.status, "cancelled")))
    .orderBy(desc(clientOnboardings.createdAt))
    .limit(1);
  if (ob && (ob.billingType === "one_off" || ob.status !== "completed")) return null;

  const period = periodOf(when);
  const [have] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.orgId, orgId), eq(projects.clientId, clientId), eq(projects.period, period)))
    .limit(1);
  if (have) return null;

  const current = period === periodOf(new Date());
  if (current) {
    // A project already started by hand this month is this month's project.
    const monthStart = new Date(`${period}-01T00:00:00Z`);
    const [manual] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.orgId, orgId), eq(projects.clientId, clientId), isNull(projects.period), isNull(projects.archivedAt), gte(projects.createdAt, monthStart)),
      )
      .orderBy(projects.createdAt)
      .limit(1);
    if (manual) {
      await db.update(projects).set({ period }).where(eq(projects.id, manual.id));
      return null;
    }
  }

  const month = london({ month: "long", year: "numeric" }, when);
  const [p] = await db
    .insert(projects)
    .values({
      orgId,
      clientId,
      name: `${c.name} — ${month}`,
      status: current ? "active" : "planning",
      period,
      brief: monthPlan(c.planName, c.bespoke, (c.features ?? {}) as Record<string, unknown>, ob?.deliverables ?? null),
    })
    .onConflictDoNothing()
    .returning({ id: projects.id });
  if (!p) return null;

  const [y, m] = period.split("-").map(Number);
  const due = (day: number) => new Date(Date.UTC(y, m - 1, day, 12));
  await db.insert(tasks).values(
    [
      ["Write and approve the month's scripts", 5],
      ["Book the shoot and confirm talent", 8],
      ["Film everything on the run sheet", 14],
      ["Edit and send cuts for client review", 21],
      ["Schedule the approved posts", 26],
    ].map(([title, day]) => ({ orgId, projectId: p.id, title: title as string, dueAt: due(day as number) })),
  );
  await db.insert(activityLog).values({
    orgId,
    actorUserId: null,
    action: "project.created",
    entityType: "project",
    entityId: p.id,
    meta: { automatic: true, period, clientId },
  });
  return p.id;
}

/** Daily: this month's project for every package client, and next month's from the 20th. */
export async function runMonthlyProjects(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const months = [now];
  if (Number(london({ day: "numeric" }, now)) >= 20) months.push(new Date(now.getTime() + 15 * 86_400_000));
  let made = 0;
  const orgs = await db.select({ id: organisations.id }).from(organisations);
  for (const org of orgs) {
    const list = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.orgId, org.id), eq(clients.status, "active"), isNotNull(clients.servicePlanId), isNull(clients.archivedAt)));
    for (const c of list) {
      for (const when of months) {
        if (await ensureMonthlyProject(org.id, c.id, when).catch(() => null)) made += 1;
      }
    }
  }
  return made;
}
