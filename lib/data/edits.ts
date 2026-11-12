import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { deliverables, projects, clients, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Edits (deliverables) data access — the review & approvals queue. EVERY query is
 * scoped to the caller's org_id — tenancy is enforced here (application layer) and,
 * as defence in depth, by Neon RLS.
 */

export type DeliverableStatus =
  | "editing"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published";

export type DeliverableRow = {
  id: string;
  title: string;
  status: DeliverableStatus;
  versionLabel: string | null;
  previewUrl: string | null;
  notes: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listDeliverables(): Promise<DeliverableRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: deliverables.id,
      title: deliverables.title,
      status: deliverables.status,
      versionLabel: deliverables.versionLabel,
      previewUrl: deliverables.previewUrl,
      notes: deliverables.notes,
      projectId: deliverables.projectId,
      projectName: projects.name,
      clientId: deliverables.clientId,
      clientName: clients.name,
      dueAt: deliverables.dueAt,
      createdAt: deliverables.createdAt,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .leftJoin(projects, eq(deliverables.projectId, projects.id))
    .leftJoin(clients, eq(deliverables.clientId, clients.id))
    .where(and(eq(deliverables.orgId, user.orgId), isNull(deliverables.archivedAt)))
    .orderBy(desc(deliverables.updatedAt));
  return rows as DeliverableRow[];
}

export async function getDeliverable(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: deliverables.id,
      title: deliverables.title,
      status: deliverables.status,
      versionLabel: deliverables.versionLabel,
      previewUrl: deliverables.previewUrl,
      notes: deliverables.notes,
      projectId: deliverables.projectId,
      projectName: projects.name,
      clientId: deliverables.clientId,
      clientName: clients.name,
      dueAt: deliverables.dueAt,
      createdAt: deliverables.createdAt,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .leftJoin(projects, eq(deliverables.projectId, projects.id))
    .leftJoin(clients, eq(deliverables.clientId, clients.id))
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, user.orgId)))
    .limit(1);
  return (row as DeliverableRow | undefined) ?? null;
}

export async function listProjectOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.orgId, user.orgId), isNull(projects.archivedAt)))
    .orderBy(asc(projects.name));
}

export async function listClientOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
    .orderBy(asc(clients.name));
}

export const deliverableInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  status: z
    .enum(["editing", "in_review", "changes_requested", "approved", "published"])
    .default("editing"),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  versionLabel: z.string().trim().max(40).nullable().optional(),
  previewUrl: z.string().trim().url("Enter a valid URL").max(2000).nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
});
export type DeliverableInput = z.infer<typeof deliverableInput>;

export async function createDeliverable(input: DeliverableInput) {
  const user = await requireUser();
  const data = deliverableInput.parse(input);
  const [row] = await getDb()
    .insert(deliverables)
    .values({
      orgId: user.orgId,
      title: data.title,
      status: data.status,
      projectId: data.projectId ?? null,
      clientId: data.clientId ?? null,
      versionLabel: data.versionLabel ?? null,
      previewUrl: data.previewUrl ?? null,
      dueAt: data.dueAt ?? null,
    })
    .returning({ id: deliverables.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.created",
    entityType: "deliverable",
    entityId: row.id,
    meta: { title: data.title, status: data.status },
  });
  return row;
}
