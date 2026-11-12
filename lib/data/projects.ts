import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { projects, clients, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Projects data access. EVERY query is scoped to the caller's org_id — tenancy is
 * enforced here (application layer) and, as defence in depth, by Neon RLS.
 */

export type ProjectRow = {
  id: string;
  name: string;
  status: "planning" | "active" | "on_hold" | "complete" | "cancelled";
  clientId: string | null;
  clientName: string | null;
  brief: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listProjects(): Promise<ProjectRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      clientId: projects.clientId,
      clientName: clients.name,
      brief: projects.brief,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.orgId, user.orgId), isNull(projects.archivedAt)))
    .orderBy(desc(projects.updatedAt));
  return rows as ProjectRow[];
}

export async function getProject(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      clientId: projects.clientId,
      clientName: clients.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), eq(projects.orgId, user.orgId)))
    .limit(1);
  return row ?? null;
}

export async function listClientOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
    .orderBy(asc(clients.name));
}

export const projectInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  status: z
    .enum(["planning", "active", "on_hold", "complete", "cancelled"])
    .default("planning"),
  clientId: z.string().uuid().nullable().optional(),
});
export type ProjectInput = z.infer<typeof projectInput>;

export async function createProject(input: ProjectInput) {
  const user = await requireUser();
  const data = projectInput.parse(input);
  const [row] = await getDb()
    .insert(projects)
    .values({
      orgId: user.orgId,
      name: data.name,
      status: data.status,
      clientId: data.clientId ?? null,
    })
    .returning({ id: projects.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "project.created",
    entityType: "project",
    entityId: row.id,
    meta: { name: data.name },
  });
  return row;
}

/** Set (or clear) a project's brief. */
export async function updateProjectBrief(projectId: string, brief: string) {
  const user = await requireUser();
  const id = z.string().uuid().parse(projectId);
  const text = z.string().trim().max(8000, "Keep the brief under 8,000 characters.").parse(brief);
  const [row] = await getDb()
    .update(projects)
    .set({ brief: text || null, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.orgId, user.orgId)))
    .returning({ id: projects.id });
  if (!row) throw new Error("That project was not found in your workspace.");
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "project.updated",
    entityType: "project",
    entityId: id,
    meta: { field: "brief" },
  });
}
