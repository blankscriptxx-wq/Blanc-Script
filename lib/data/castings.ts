import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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
  talentAvailability,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

import type { CostOwner, RateMode } from "@/lib/casting-cost";
export { bookingCostPence } from "@/lib/casting-cost";
export type { CostOwner, RateMode } from "@/lib/casting-cost";

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
  talentDayRatePence: number | null;
  durationMinutes: number | null;
  rateMode: RateMode;
  dayCount: number | null;
  costOwner: CostOwner;
  status: CastingStatus;
  rating: number | null;
  /** The talent is marked unavailable on this shoot's date. */
  unavailableClash: boolean;
  /** The talent is booked on another shoot the same day. */
  dayClash: boolean;
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

/** Strip pay figures from castings for people who can't see talent pay. */
function withoutPay<T extends object>(rows: T[], user: { capabilities: Set<string> }): T[] {
  if (user.capabilities.has("can_see_actor_pay")) return rows;
  const PAY = ["agreedRatePence", "talentRatePence", "talentDayRatePence"];
  return rows.map((r) => {
    const copy = { ...r } as Record<string, unknown>;
    for (const k of PAY) if (k in copy) copy[k] = null;
    return copy as T;
  });
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
  if (!user.capabilities.has("can_see_actor_pay")) {
    return rows.map((r) => ({ ...r, ratePerHourPence: null }));
  }
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
      talentDayRatePence: talent.dayRatePence,
      durationMinutes: shootTalent.durationMinutes,
      rateMode: shootTalent.rateMode,
      dayCount: shootTalent.dayCount,
      costOwner: shootTalent.costOwner,
      status: shootTalent.status,
      rating: shootTalent.rating,
      unavailableClash: sql<boolean>`exists (
        select 1 from ${talentAvailability} ta
        where ta.talent_id = ${shootTalent.talentId}
          and ta.org_id = ${shootTalent.orgId}
          and ta.kind = 'unavailable'
          and ${shoots.scheduledAt} is not null
          -- Compare calendar days (UK time): a one-day window covers the whole day.
          and (${shoots.scheduledAt} at time zone 'Europe/London')::date
              between (ta.start_date at time zone 'Europe/London')::date
                  and (ta.end_date at time zone 'Europe/London')::date
      )`,
      dayClash: sql<boolean>`exists (
        select 1 from ${shootTalent} st2
        join ${shoots} s2 on s2.id = st2.shoot_id
        where st2.talent_id = ${shootTalent.talentId}
          and st2.id <> ${shootTalent.id}
          and ${shoots.scheduledAt} is not null
          and s2.scheduled_at is not null
          and date(s2.scheduled_at) = date(${shoots.scheduledAt})
      )`,
    })
    .from(shootTalent)
    .innerJoin(shoots, eq(shootTalent.shootId, shoots.id))
    .innerJoin(talent, eq(shootTalent.talentId, talent.id))
    .where(eq(shootTalent.orgId, user.orgId))
    .orderBy(asc(talent.name));
  return withoutPay(rows as ShootCasting[], user);
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
  return withoutPay(rows as ProjectCasting[], user);
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
  return withoutPay(rows as ContentCasting[], user);
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
  rateMode: z.enum(["hourly", "day"]).default("hourly"),
  dayCount: z.number().int().min(1).max(365).optional().nullable(),
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
      rateMode: input.rateMode,
      dayCount: input.dayCount ?? null,
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

export async function setShootCastingRating(id: string, rating: number | null) {
  const user = await requireUser();
  const safe = rating == null ? null : Math.max(1, Math.min(5, Math.round(rating)));
  await getDb()
    .update(shootTalent)
    .set({ rating: safe })
    .where(and(eq(shootTalent.id, id), eq(shootTalent.orgId, user.orgId)));
}

/** Soft clash check for a talent on a shoot's date (unavailable window or same-day booking). */
export async function checkShootClash(
  shootId: string,
  talentId: string,
): Promise<{ unavailable: boolean; dayClash: boolean }> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      unavailable: sql<boolean>`exists (
        select 1 from ${talentAvailability} ta
        join ${shoots} s on s.id = ${shootId}
        where ta.talent_id = ${talentId} and ta.org_id = ${user.orgId}
          and ta.kind = 'unavailable' and s.scheduled_at is not null
          and (s.scheduled_at at time zone 'Europe/London')::date
              between (ta.start_date at time zone 'Europe/London')::date
                  and (ta.end_date at time zone 'Europe/London')::date
      )`,
      dayClash: sql<boolean>`exists (
        select 1 from ${shootTalent} st
        join ${shoots} s2 on s2.id = st.shoot_id
        join ${shoots} s on s.id = ${shootId}
        where st.talent_id = ${talentId} and st.org_id = ${user.orgId}
          and st.shoot_id <> ${shootId}
          and s.scheduled_at is not null and s2.scheduled_at is not null
          and (s2.scheduled_at at time zone 'Europe/London')::date = (s.scheduled_at at time zone 'Europe/London')::date
      )`,
    })
    .from(shoots)
    .where(and(eq(shoots.id, shootId), eq(shoots.orgId, user.orgId)))
    .limit(1);
  return { unavailable: Boolean(row?.unavailable), dayClash: Boolean(row?.dayClash) };
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
