import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, projects, tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Tasks data access. EVERY query is scoped to the caller's org_id — tenancy is
 * enforced here (application layer) and, as defence in depth, by Neon RLS.
 */

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type TaskRow = {
  id: string;
  projectId: string | null;
  title: string;
  status: TaskStatus;
  dueAt: Date | null;
  createdAt: Date;
};

export async function listTasksForProject(projectId: string): Promise<TaskRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      status: tasks.status,
      dueAt: tasks.dueAt,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.orgId, user.orgId),
        eq(tasks.projectId, projectId),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(asc(tasks.createdAt));
  return rows as TaskRow[];
}

const taskStatus = z.enum(["todo", "in_progress", "blocked", "done"]);

export const createTaskInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  status: taskStatus.default("todo"),
  dueAt: z.date().nullable().optional(),
});
export type CreateTaskInput = z.input<typeof createTaskInput>;

export async function createTask(raw: CreateTaskInput) {
  const user = await requireUser();
  const input = createTaskInput.parse(raw);
  const db = getDb();

  // Org-guard the project and inherit its client for the task.
  const [project] = await db
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.orgId, user.orgId)))
    .limit(1);
  if (!project) throw new Error("That project was not found in your workspace.");

  const [row] = await db
    .insert(tasks)
    .values({
      orgId: user.orgId,
      projectId: project.id,
      clientId: project.clientId,
      title: input.title,
      status: input.status,
      dueAt: input.dueAt ?? null,
    })
    .returning({ id: tasks.id });

  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "task.created",
    entityType: "task",
    entityId: row.id,
    meta: { projectId: project.id, title: input.title },
  });
  return row;
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const user = await requireUser();
  const nextStatus = taskStatus.parse(status);
  const db = getDb();

  const [row] = await db
    .update(tasks)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, user.orgId)))
    .returning({ id: tasks.id, projectId: tasks.projectId });
  if (!row) throw new Error("That task was not found in your workspace.");

  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "task.moved",
    entityType: "task",
    entityId: row.id,
    meta: { status: nextStatus },
  });
  return row;
}
