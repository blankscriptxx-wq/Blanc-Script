import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, servicePlans } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

/**
 * Service packages (retainer tiers) data access. EVERY query is scoped to the
 * caller's org_id. All mutations are settings changes — gated on `can_settings`.
 */

export type PlanBilling = "monthly" | "bespoke";

export type ServicePlanRow = {
  id: string;
  code: string;
  name: string;
  pricePence: number | null;
  billing: PlanBilling;
  mostPopular: boolean;
  bespoke: boolean;
  sortOrder: number;
};

const planColumns = {
  id: servicePlans.id,
  code: servicePlans.code,
  name: servicePlans.name,
  pricePence: servicePlans.pricePence,
  billing: servicePlans.billing,
  mostPopular: servicePlans.mostPopular,
  bespoke: servicePlans.bespoke,
  sortOrder: servicePlans.sortOrder,
} as const;

/** Live, non-archived packages for the caller's org, in display order. */
export async function listServicePlans(): Promise<ServicePlanRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select(planColumns)
    .from(servicePlans)
    .where(and(eq(servicePlans.orgId, user.orgId), isNull(servicePlans.archivedAt)))
    .orderBy(asc(servicePlans.sortOrder));
  return rows as ServicePlanRow[];
}

function assertCanSettings(user: { capabilities: Set<string> }): void {
  if (!user.capabilities.has("can_settings")) {
    throw new Error("You do not have permission to change service packages.");
  }
}

const createPlanInput = z.object({
  code: z.string().trim().min(1, "Code is required").max(40),
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  pricePence: z.number().int().nonnegative().nullable().optional(),
  billing: z.enum(["monthly", "bespoke"]).default("monthly"),
  mostPopular: z.boolean().optional(),
  bespoke: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanInput>;

export async function createServicePlan(raw: CreatePlanInput): Promise<ServicePlanRow> {
  const user = await requireUser();
  assertCanSettings(user);
  const data = createPlanInput.parse(raw);
  const bespoke = data.bespoke ?? data.billing === "bespoke";
  const db = getDb();
  const [row] = await db
    .insert(servicePlans)
    .values({
      orgId: user.orgId,
      code: data.code,
      name: data.name,
      pricePence: bespoke ? null : data.pricePence ?? null,
      billing: data.billing,
      mostPopular: data.mostPopular ?? false,
      bespoke,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning(planColumns);
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "plan.created",
    entityType: "service_plan",
    entityId: row.id,
    meta: { code: row.code, name: row.name },
  });
  return row as ServicePlanRow;
}

const updatePlanInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long").optional(),
  pricePence: z.number().int().nonnegative().nullable().optional(),
  mostPopular: z.boolean().optional(),
  bespoke: z.boolean().optional(),
  billing: z.enum(["monthly", "bespoke"]).optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanInput>;

export async function updateServicePlan(
  id: string,
  raw: UpdatePlanInput,
): Promise<ServicePlanRow> {
  const user = await requireUser();
  assertCanSettings(user);
  const data = updatePlanInput.parse(raw);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.mostPopular !== undefined) patch.mostPopular = data.mostPopular;
  if (data.billing !== undefined) patch.billing = data.billing;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.bespoke !== undefined) {
    patch.bespoke = data.bespoke;
    // Bespoke tiers carry no fixed price.
    if (data.bespoke) patch.pricePence = null;
  }
  if (data.pricePence !== undefined && patch.pricePence === undefined) {
    patch.pricePence = data.pricePence;
  }

  const db = getDb();
  const [row] = await db
    .update(servicePlans)
    .set(patch)
    .where(and(eq(servicePlans.id, id), eq(servicePlans.orgId, user.orgId)))
    .returning(planColumns);
  if (!row) throw new Error("Package not found.");
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "plan.updated",
    entityType: "service_plan",
    entityId: row.id,
    meta: { code: row.code, name: row.name },
  });
  return row as ServicePlanRow;
}

export async function archiveServicePlan(id: string): Promise<{ id: string }> {
  const user = await requireUser();
  assertCanSettings(user);
  const db = getDb();
  const [row] = await db
    .update(servicePlans)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(servicePlans.id, id), eq(servicePlans.orgId, user.orgId)))
    .returning({ id: servicePlans.id, code: servicePlans.code, name: servicePlans.name });
  if (!row) throw new Error("Package not found.");
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "plan.archived",
    entityType: "service_plan",
    entityId: row.id,
    meta: { code: row.code, name: row.name },
  });
  return { id: row.id };
}
