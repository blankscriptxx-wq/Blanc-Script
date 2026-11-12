import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { shoots, clients, projects, activityLog, shootTalent, talent } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Shoots data access (production bookings). EVERY query is scoped to the
 * caller's org_id — tenancy is enforced here (application layer) and, as
 * defence in depth, by Neon RLS.
 */

export type ShootRow = {
  id: string;
  title: string;
  status: "booked" | "on_site" | "wrapped" | "cancelled";
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  scheduledAt: Date | null;
  locationName: string | null;
  createdAt: Date;
};

export async function listShoots(): Promise<ShootRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: shoots.id,
      title: shoots.title,
      status: shoots.status,
      clientId: shoots.clientId,
      clientName: clients.name,
      projectId: shoots.projectId,
      projectName: projects.name,
      scheduledAt: shoots.scheduledAt,
      locationName: shoots.locationName,
      createdAt: shoots.createdAt,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(projects, eq(shoots.projectId, projects.id))
    .where(and(eq(shoots.orgId, user.orgId), isNull(shoots.archivedAt)))
    .orderBy(asc(shoots.scheduledAt));
  return rows as ShootRow[];
}

export async function getShoot(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: shoots.id,
      title: shoots.title,
      status: shoots.status,
      clientId: shoots.clientId,
      clientName: clients.name,
      projectId: shoots.projectId,
      projectName: projects.name,
      scheduledAt: shoots.scheduledAt,
      locationName: shoots.locationName,
      createdAt: shoots.createdAt,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(projects, eq(shoots.projectId, projects.id))
    .where(and(eq(shoots.id, id), eq(shoots.orgId, user.orgId)))
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

/** Projects for the shoot's project picker (with each project's client). */
export async function listProjectOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.orgId, user.orgId), isNull(projects.archivedAt)))
    .orderBy(asc(projects.name));
}

/** Resolve a project in the caller's workspace, or throw. */
async function requireProjectInOrg(projectId: string, orgId: string) {
  const [row] = await getDb()
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("That project was not found in your workspace.");
  return row;
}

/** Link a shoot to a project (or unlink it with null). */
export async function setShootProject(shootId: string, projectId: string | null) {
  const user = await requireUser();
  const id = z.string().uuid().parse(shootId);
  const project = projectId
    ? await requireProjectInOrg(z.string().uuid().parse(projectId), user.orgId)
    : null;

  const [current] = await getDb()
    .select({ clientId: shoots.clientId })
    .from(shoots)
    .where(and(eq(shoots.id, id), eq(shoots.orgId, user.orgId)))
    .limit(1);
  if (!current) throw new Error("That shoot was not found in your workspace.");

  await getDb()
    .update(shoots)
    .set({
      projectId: project?.id ?? null,
      // A shoot with no client takes its project's client.
      clientId: current.clientId ?? project?.clientId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(shoots.id, id), eq(shoots.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "shoot.updated",
    entityType: "shoot",
    entityId: id,
    meta: { projectId: project?.id ?? null },
  });
}

export const shootInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().trim().min(1).nullable().optional(),
  locationName: z.string().trim().max(200).nullable().optional(),
  /** Talent to pencil onto the shoot at booking time. */
  talentIds: z.array(z.string().uuid()).optional(),
});
export type ShootInput = z.infer<typeof shootInput>;

/** Talent for the booking picker (active talent only). */
export async function listTalentOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: talent.id, name: talent.name, ratePerHourPence: talent.ratePerHourPence })
    .from(talent)
    .where(and(eq(talent.orgId, user.orgId), eq(talent.status, "active")))
    .orderBy(asc(talent.name));
}

export async function createShoot(input: ShootInput) {
  const user = await requireUser();
  const data = shootInput.parse(input);

  let scheduledAt: Date | null = null;
  if (data.scheduledAt) {
    const parsed = new Date(data.scheduledAt);
    scheduledAt = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const project = data.projectId ? await requireProjectInOrg(data.projectId, user.orgId) : null;

  const [row] = await getDb()
    .insert(shoots)
    .values({
      orgId: user.orgId,
      // A shoot booked against a project takes that project's client by default.
      clientId: data.clientId ?? project?.clientId ?? null,
      projectId: project?.id ?? null,
      title: data.title,
      scheduledAt,
      locationName: data.locationName ?? null,
    })
    .returning({ id: shoots.id });

  // Pencil on any talent chosen during booking (org-scoped guard on ids).
  if (data.talentIds && data.talentIds.length) {
    const owned = await getDb()
      .select({ id: talent.id })
      .from(talent)
      .where(and(eq(talent.orgId, user.orgId), inArray(talent.id, data.talentIds)));
    const validIds = new Set(owned.map((t) => t.id));
    const toInsert = data.talentIds
      .filter((id) => validIds.has(id))
      .map((talentId) => ({
        orgId: user.orgId,
        shootId: row.id,
        talentId,
        status: "pencilled" as const,
      }));
    if (toInsert.length) await getDb().insert(shootTalent).values(toInsert);
  }

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "shoot.created",
    entityType: "shoot",
    entityId: row.id,
    meta: { title: data.title, talentCount: data.talentIds?.length ?? 0 },
  });
  return row;
}
