import "server-only";
import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { talent, talentAvailability, activityLog } from "@/lib/db/schema";
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
  dayRatePence: number | null;
  tags: string[];
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
      dayRatePence: talent.dayRatePence,
      tags: talent.tags,
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
  return rows.map((r) => ({ ...r, tags: r.tags ?? [] })) as TalentRow[];
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
  dayRatePence: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  agentName: z.string().trim().max(160).nullable().optional(),
  agentContact: z.string().trim().max(200).nullable().optional(),
  baseLocation: z.string().trim().max(160).nullable().optional(),
  instagram: z.string().trim().max(80).nullable().optional(),
  bankAccountName: z.string().trim().max(160).nullable().optional(),
  bankSortCode: z.string().trim().max(12).nullable().optional(),
  bankAccountNumber: z.string().trim().max(34).nullable().optional(),
  heightCm: z.number().int().min(0).max(300).nullable().optional(),
  wardrobeNotes: z.string().trim().max(500).nullable().optional(),
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
      dayRatePence: data.dayRatePence ?? null,
      tags: data.tags ?? [],
      agentName: data.agentName ?? null,
      agentContact: data.agentContact ?? null,
      baseLocation: data.baseLocation ?? null,
      instagram: data.instagram ? data.instagram.replace(/^@/, "") : null,
      bankAccountName: data.bankAccountName ?? null,
      bankSortCode: data.bankSortCode ?? null,
      bankAccountNumber: data.bankAccountNumber ?? null,
      heightCm: data.heightCm ?? null,
      wardrobeNotes: data.wardrobeNotes ?? null,
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

// ── Availability ─────────────────────────────────────────────────────────────
export type AvailabilityRow = {
  id: string;
  kind: "available" | "unavailable";
  startDate: Date;
  endDate: Date;
  note: string | null;
};

export async function listAvailability(talentId: string): Promise<AvailabilityRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: talentAvailability.id,
      kind: talentAvailability.kind,
      startDate: talentAvailability.startDate,
      endDate: talentAvailability.endDate,
      note: talentAvailability.note,
    })
    .from(talentAvailability)
    .where(
      and(
        eq(talentAvailability.orgId, user.orgId),
        eq(talentAvailability.talentId, talentId),
      ),
    )
    .orderBy(desc(talentAvailability.startDate));
  return rows as AvailabilityRow[];
}

export const availabilityInput = z.object({
  talentId: z.string().uuid(),
  kind: z.enum(["available", "unavailable"]).default("unavailable"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  note: z.string().trim().max(200).nullable().optional(),
});

export type AddAvailabilityInput = {
  talentId: string;
  kind?: "available" | "unavailable";
  startDate: string | Date;
  endDate: string | Date;
  note?: string | null;
};

export async function addAvailability(input: AddAvailabilityInput) {
  const user = await requireUser();
  const data = availabilityInput.parse(input);
  if (data.endDate < data.startDate) {
    throw new Error("End date can't be before the start date.");
  }
  // Guard: talent belongs to this org.
  const [t] = await getDb()
    .select({ id: talent.id })
    .from(talent)
    .where(and(eq(talent.id, data.talentId), eq(talent.orgId, user.orgId)))
    .limit(1);
  if (!t) throw new Error("That talent was not found in your workspace.");
  const [row] = await getDb()
    .insert(talentAvailability)
    .values({
      orgId: user.orgId,
      talentId: data.talentId,
      kind: data.kind,
      startDate: data.startDate,
      endDate: data.endDate,
      note: data.note ?? null,
    })
    .returning({ id: talentAvailability.id });
  return row;
}

export async function removeAvailability(id: string) {
  const user = await requireUser();
  await getDb()
    .delete(talentAvailability)
    .where(
      and(eq(talentAvailability.id, id), eq(talentAvailability.orgId, user.orgId)),
    );
}
