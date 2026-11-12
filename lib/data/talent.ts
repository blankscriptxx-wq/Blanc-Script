import "server-only";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { talent, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Talent (on-camera talent/actor book) data access. EVERY query is scoped to the
 * caller's org_id — tenancy is enforced here (application layer) and, as defence
 * in depth, by Neon RLS.
 */

export type TalentRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "inactive" | "archived";
  ratePerHourPence: number | null;
  notes: string | null;
  createdAt: Date;
};

export async function listTalent(): Promise<TalentRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: talent.id,
      name: talent.name,
      email: talent.email,
      phone: talent.phone,
      status: talent.status,
      ratePerHourPence: talent.ratePerHourPence,
      notes: talent.notes,
      createdAt: talent.createdAt,
    })
    .from(talent)
    .where(
      and(
        eq(talent.orgId, user.orgId),
        ne(talent.status, "archived"),
        isNull(talent.archivedAt),
      ),
    )
    .orderBy(asc(talent.name));
  return rows as TalentRow[];
}

export async function getTalent(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: talent.id,
      name: talent.name,
      email: talent.email,
      phone: talent.phone,
      status: talent.status,
      ratePerHourPence: talent.ratePerHourPence,
      notes: talent.notes,
      createdAt: talent.createdAt,
    })
    .from(talent)
    .where(and(eq(talent.id, id), eq(talent.orgId, user.orgId)))
    .limit(1);
  return row ?? null;
}

export const talentInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().trim().email("Enter a valid email").max(254).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  ratePerHourPence: z.number().int().nonnegative().nullable().optional(),
});
export type TalentInput = z.infer<typeof talentInput>;

export async function createTalent(input: TalentInput) {
  const user = await requireUser();
  const data = talentInput.parse(input);
  const [row] = await getDb()
    .insert(talent)
    .values({
      orgId: user.orgId,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      status: data.status,
      ratePerHourPence: data.ratePerHourPence ?? null,
    })
    .returning({ id: talent.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "talent.created",
    entityType: "talent",
    entityId: row.id,
    meta: { name: data.name },
  });
  return row;
}
