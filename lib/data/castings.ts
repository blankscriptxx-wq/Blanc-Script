import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  contentItems,
  contentTalent,
  projects,
  projectTalent,
  shoots,
  shootTalent,
  talent,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

import type { CostOwner } from "@/lib/casting-cost";
export { bookingCostPence } from "@/lib/casting-cost";
export type { CostOwner } from "@/lib/casting-cost";

export type CastingStatus = "pencilled" | "confirmed" | "released";

export type ShootCasting = {
  id: string;
  shootId: string;
  shootTitle: string;
  talentId: string;
  talentName: string;
  roleName: string | null;
  callTime: Date | null;
  agreedRatePence: number | null;
  talentRatePence: number | null;
  durationMinutes: number | null;
  costOwner: CostOwner;
  status: CastingStatus;
};

export type ProjectCasting = {
  id: string;
  projectId: string;
  projectName: string;
  talentId: string;
  talentName: string;
  roleName: string | null;
  agreedRatePence: number | null;
  talentRatePence: number | null;
};

export type ContentCasting = {
  id: string;
  contentItemId: string;
  contentTitle: string;
  talentId: string;
  talentName: string;
  roleName: string | null;
};

export type TalentPickerOption = {
  id: string;
  name: string;
  ratePerHourPence: number | null;
};

/** The effective rate for a booking: the override, else the talent's hourly rate. */
export function effectiveRatePence(
  agreedRatePence: number | null,
  talentRatePence: number | null,
): number | null {
  return agreedRatePence ?? talentRatePence;
}

// ── Pickers ─────────────────────────────────────────────────────────────────
export async function listTalentPickerOptions(): Promise<TalentPickerOption[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: talent.id,
      name: talent.name,
      ratePerHourPence: talent.ratePerHourPence,
    })
    .from(talent)
    .where(and(eq(talent.orgId, user.orgId), eq(talent.status, "active")))
    .orderBy(asc(talent.name));
  return rows;
}

// ── Reads (whole-org lists; callers group by parent or by talent) ────────────
export async function listShootCastings(): Promise<ShootCasting[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: shootTalent.id,
      shootId: shootTalent.shootId,
      shootTitle: shoots.title,
      talentId: shootTalent.talentId,
      talentName: talent.name,
      roleName: shootTalent.roleName,
      callTime: shootTalent.callTime,
      agreedRatePence: shootTalent.agreedRatePence,
      talentRatePence: talent.ratePerHourPence,
      durationMinutes: shootTalent.durationMinutes,
      costOwner: shootTalent.costOwner,
      status: shootTalent.status,
    })
    .from(shootTalent)
    .innerJoin(shoots, eq(shootTalent.shootId, shoots.id))
    .innerJoin(talent, eq(shootTalent.talentId, talent.id))
    .where(eq(shootTalent.orgId, user.orgId))
    .orderBy(asc(talent.name));
  return rows as ShootCasting[];
}

export async function listProjectCastings(): Promise<ProjectCasting[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: projectTalent.id,
      projectId: projectTalent.projectId,
      projectName: projects.name,
      talentId: projectTalent.talentId,
      talentName: talent.name,
      roleName: projectTalent.roleName,
      agreedRatePence: projectTalent.agreedRatePence,
      talentRatePence: talent.ratePerHourPence,
    })
    .from(projectTalent)
    .innerJoin(projects, eq(projectTalent.projectId, projects.id))
    .innerJoin(talent, eq(projectTalent.talentId, talent.id))
    .where(eq(projectTalent.orgId, user.orgId))
    .orderBy(asc(talent.name));
  return rows as ProjectCasting[];
}

export async function listContentCastings(): Promise<ContentCasting[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: contentTalent.id,
      contentItemId: contentTalent.contentItemId,
      contentTitle: contentItems.title,
      talentId: contentTalent.talentId,
      talentName: talent.name,
      roleName: contentTalent.roleName,
    })
    .from(contentTalent)
    .innerJoin(contentItems, eq(contentTalent.contentItemId, contentItems.id))
    .innerJoin(talent, eq(contentTalent.talentId, talent.id))
    .where(eq(contentTalent.orgId, user.orgId))
    .orderBy(asc(talent.name));
  return rows as ContentCasting[];
}

// ── Guards ───────────────────────────────────────────────────────────────────
async function assertOwned(
  orgId: string,
  table: typeof shoots | typeof projects | typeof contentItems | typeof talent,
  id: string,
  label: string,
) {
  const [row] = await getDb()
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error(`That ${label} was not found in your workspace.`);
}

// ── Writes ───────────────────────────────────────────────────────────────────
const castingStatus = z.enum(["pencilled", "confirmed", "released"]);

const shootCastingInput = z.object({
  shootId: z.string().uuid(),
  talentId: z.string().uuid(),
  roleName: z.string().trim().max(120).optional().nullable(),
  callTime: z.date().optional().nullable(),
  agreedRatePence: z.number().int().min(0).optional().nullable(),
  durationMinutes: z.number().int().min(0).max(100000).optional().nullable(),
  costOwner: z.enum(["client", "agency"]).default("client"),
  status: castingStatus.default("pencilled"),
});

export async function addShootCasting(raw: z.input<typeof shootCastingInput>) {
  const user = await requireUser();
  const input = shootCastingInput.parse(raw);
  await assertOwned(user.orgId, shoots, input.shootId, "shoot");
  await assertOwned(user.orgId, talent, input.talentId, "talent");
  const db = getDb();
  const [row] = await db
    .insert(shootTalent)
    .values({
      orgId: user.orgId,
      shootId: input.shootId,
      talentId: input.talentId,
      roleName: input.roleName ?? null,
      callTime: input.callTime ?? null,
      agreedRatePence: input.agreedRatePence ?? null,
      durationMinutes: input.durationMinutes ?? null,
      costOwner: input.costOwner,
      status: input.status,
    })
    .returning({ id: shootTalent.id });
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "casting.shoot.added",
    entityType: "shoot",
    entityId: input.shootId,
    meta: { talentId: input.talentId },
  });
  return row;
}

const projectCastingInput = z.object({
  projectId: z.string().uuid(),
  talentId: z.string().uuid(),
  roleName: z.string().trim().max(120).optional().nullable(),
  agreedRatePence: z.number().int().min(0).optional().nullable(),
});

export async function addProjectCasting(raw: z.input<typeof projectCastingInput>) {
  const user = await requireUser();
  const input = projectCastingInput.parse(raw);
  await assertOwned(user.orgId, projects, input.projectId, "project");
  await assertOwned(user.orgId, talent, input.talentId, "talent");
  const db = getDb();
  const [row] = await db
    .insert(projectTalent)
    .values({
      orgId: user.orgId,
      projectId: input.projectId,
      talentId: input.talentId,
      roleName: input.roleName ?? null,
      agreedRatePence: input.agreedRatePence ?? null,
    })
    .returning({ id: projectTalent.id });
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "casting.project.added",
    entityType: "project",
    entityId: input.projectId,
    meta: { talentId: input.talentId },
  });
  return row;
}

const contentCastingInput = z.object({
  contentItemId: z.string().uuid(),
  talentId: z.string().uuid(),
  roleName: z.string().trim().max(120).optional().nullable(),
});

export async function addContentCasting(raw: z.input<typeof contentCastingInput>) {
  const user = await requireUser();
  const input = contentCastingInput.parse(raw);
  await assertOwned(user.orgId, contentItems, input.contentItemId, "content item");
  await assertOwned(user.orgId, talent, input.talentId, "talent");
  const db = getDb();
  const [row] = await db
    .insert(contentTalent)
    .values({
      orgId: user.orgId,
      contentItemId: input.contentItemId,
      talentId: input.talentId,
      roleName: input.roleName ?? null,
    })
    .returning({ id: contentTalent.id });
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "casting.content.added",
    entityType: "content_item",
    entityId: input.contentItemId,
    meta: { talentId: input.talentId },
  });
  return row;
}

// ── Removals (org-scoped by id) ──────────────────────────────────────────────
async function removeById(
  table: typeof shootTalent | typeof projectTalent | typeof contentTalent,
  id: string,
) {
  const user = await requireUser();
  await getDb()
    .delete(table)
    .where(and(eq(table.id, id), eq(table.orgId, user.orgId)));
}

export const removeShootCasting = (id: string) => removeById(shootTalent, id);
export const removeProjectCasting = (id: string) => removeById(projectTalent, id);
export const removeContentCasting = (id: string) => removeById(contentTalent, id);
