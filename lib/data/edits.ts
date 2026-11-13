import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { deliverables, projects, clients, shoots, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Edits (deliverables) data access — the review & approvals queue. EVERY query is
 * scoped to the caller's org_id — tenancy is enforced here (application layer) and,
 * as defence in depth, by Neon RLS.
 */

export type DeliverableStatus =
  | "to_film"
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

/** Shoots for the deliverable picker (active, non-archived). */
export async function listShootOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: shoots.id, title: shoots.title })
    .from(shoots)
    .where(and(eq(shoots.orgId, user.orgId), isNull(shoots.archivedAt)))
    .orderBy(asc(shoots.title));
}

/**
 * Org members for the reviewer picker. Resolves the membership's user_id to a
 * name via Neon Auth's `neon_auth."user"` table (outside our Drizzle model —
 * joined via raw SQL, as in the Team module).
 */
export async function listReviewerOptions(): Promise<
  { id: string; name: string | null }[]
> {
  const user = await requireUser();
  const { rows } = await getDb().execute(sql`
    select m.user_id as "id", u.name as "name"
    from memberships m
    join neon_auth."user" u on u.id = m.user_id
    where m.org_id = ${user.orgId} and m.status = 'active'
    order by u.name
  `);
  return rows as { id: string; name: string | null }[];
}

export const deliverableInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  status: z
    .enum(["to_film", "editing", "in_review", "changes_requested", "approved", "published"])
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

/** Confirm the deliverable exists and belongs to the caller's org; returns its id or null. */
async function assertDeliverableInOrg(id: string, orgId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: deliverables.id })
    .from(deliverables)
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, orgId)))
    .limit(1);
  return row?.id ?? null;
}

export const updateDeliverableInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  shootId: z.string().uuid().nullable().optional(),
  versionLabel: z.string().trim().max(40).nullable().optional(),
  reviewerUserId: z.string().uuid().nullable().optional(),
  reviewDueAt: z.coerce.date().nullable().optional(),
});
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableInput>;

/** Edit a deliverable's details. Org-scoped + ownership guard; only provided fields change. */
export async function updateDeliverable(id: string, input: UpdateDeliverableInput) {
  const user = await requireUser();
  const data = updateDeliverableInput.parse(input);
  const owned = await assertDeliverableInOrg(id, user.orgId);
  if (!owned) throw new Error("Deliverable not found.");

  const set: Partial<typeof deliverables.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) set.title = data.title;
  if (data.dueAt !== undefined) set.dueAt = data.dueAt;
  if (data.projectId !== undefined) set.projectId = data.projectId;
  if (data.clientId !== undefined) set.clientId = data.clientId;
  if (data.shootId !== undefined) set.shootId = data.shootId;
  if (data.versionLabel !== undefined) set.versionLabel = data.versionLabel;
  if (data.reviewerUserId !== undefined) set.reviewerUserId = data.reviewerUserId;
  if (data.reviewDueAt !== undefined) set.reviewDueAt = data.reviewDueAt;

  await getDb()
    .update(deliverables)
    .set(set)
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.updated",
    entityType: "deliverable",
    entityId: id,
    meta: {},
  });
  return { id };
}

/** Archive a deliverable (soft delete — drops it from the queue). */
export async function archiveDeliverable(id: string) {
  const user = await requireUser();
  const owned = await assertDeliverableInOrg(id, user.orgId);
  if (!owned) throw new Error("Deliverable not found.");

  await getDb()
    .update(deliverables)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.archived",
    entityType: "deliverable",
    entityId: id,
    meta: {},
  });
  return { id };
}
