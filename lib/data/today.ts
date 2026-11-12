import "server-only";
import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";
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
