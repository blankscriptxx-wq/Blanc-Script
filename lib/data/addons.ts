import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, addOns } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Add-ons (extra services billed on top of a retainer) data access. EVERY query
 * is scoped to the caller's org_id. All mutations are settings changes — gated
 * on `can_settings`. The add_ons table has no soft-delete column, so "archive"
 * is a hard delete.
 */

export {
  ADDON_CADENCES,
  ADDON_CADENCE_LABELS,
  type AddonCadence,
} from "@/lib/addons-constants";
import type { AddonCadence } from "@/lib/addons-constants";

export type AddOnRow = {
  id: string;
  name: string;
  pricePence: number | null;
  cadence: AddonCadence;
  freeWithPlanCode: string | null;
  notes: string | null;
  sortOrder: number;
};

const addonColumns = {
  id: addOns.id,
  name: addOns.name,
  pricePence: addOns.pricePence,
  cadence: addOns.cadence,
  freeWithPlanCode: addOns.freeWithPlanCode,
  notes: addOns.notes,
  sortOrder: addOns.sortOrder,
} as const;

/** All add-ons for the caller's org, in display order. */
export async function listAddOns(): Promise<AddOnRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select(addonColumns)
    .from(addOns)
    .where(eq(addOns.orgId, user.orgId))
    .orderBy(asc(addOns.sortOrder), asc(addOns.name));
  return rows as AddOnRow[];
}

function assertCanSettings(user: { capabilities: Set<string> }): void {
  if (!user.capabilities.has("can_settings")) {
    throw new Error("You do not have permission to change add-ons.");
  }
}

const createAddonInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  pricePence: z.number().int().nonnegative().nullable().optional(),
  cadence: z.enum(["monthly", "one_off", "hourly", "per_job", "bespoke"]).default("monthly"),
  freeWithPlanCode: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateAddonInput = z.infer<typeof createAddonInput>;

export async function createAddOn(raw: CreateAddonInput): Promise<AddOnRow> {
  const user = await requireUser();
  assertCanSettings(user);
  const data = createAddonInput.parse(raw);
  const bespoke = data.cadence === "bespoke";
  const db = getDb();
  const [row] = await db
    .insert(addOns)
    .values({
      orgId: user.orgId,
      name: data.name,
      pricePence: bespoke ? null : data.pricePence ?? null,
      cadence: data.cadence,
      freeWithPlanCode: data.freeWithPlanCode ?? null,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning(addonColumns);
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "addon.created",
    entityType: "add_on",
    entityId: row.id,
    meta: { name: row.name },
  });
  return row as AddOnRow;
}

const updateAddonInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long").optional(),
  pricePence: z.number().int().nonnegative().nullable().optional(),
  cadence: z.enum(["monthly", "one_off", "hourly", "per_job", "bespoke"]).optional(),
  freeWithPlanCode: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateAddonInput = z.infer<typeof updateAddonInput>;

export async function updateAddOn(id: string, raw: UpdateAddonInput): Promise<AddOnRow> {
  const user = await requireUser();
  assertCanSettings(user);
  const data = updateAddonInput.parse(raw);

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.cadence !== undefined) {
    patch.cadence = data.cadence;
    // Bespoke add-ons carry no fixed price.
    if (data.cadence === "bespoke") patch.pricePence = null;
  }
  if (data.freeWithPlanCode !== undefined) patch.freeWithPlanCode = data.freeWithPlanCode;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.pricePence !== undefined && patch.pricePence === undefined) {
    patch.pricePence = data.pricePence;
  }

  const db = getDb();
  const [row] = await db
    .update(addOns)
    .set(patch)
    .where(and(eq(addOns.id, id), eq(addOns.orgId, user.orgId)))
    .returning(addonColumns);
  if (!row) throw new Error("Add-on not found.");
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "addon.updated",
    entityType: "add_on",
    entityId: row.id,
    meta: { name: row.name },
  });
  return row as AddOnRow;
}

/** Remove an add-on. No soft-delete column exists, so this is a hard delete. */
export async function archiveAddOn(id: string): Promise<{ id: string }> {
  const user = await requireUser();
  assertCanSettings(user);
  const db = getDb();
  const [row] = await db
    .delete(addOns)
    .where(and(eq(addOns.id, id), eq(addOns.orgId, user.orgId)))
    .returning({ id: addOns.id, name: addOns.name });
  if (!row) throw new Error("Add-on not found.");
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "addon.archived",
    entityType: "add_on",
    entityId: row.id,
    meta: { name: row.name },
  });
  return { id: row.id };
}
