import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clients, servicePlans, activityLog } from "@/lib/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

/**
 * Clients data access. EVERY query is scoped to the caller's org_id — tenancy is
 * enforced here (application layer) and, as defence in depth, by Neon RLS.
 */

export async function requireUser(): Promise<CurrentUser & { orgId: string }> {
  const user = await getCurrentUser();
  if (!user || !user.hasAccess || !user.orgId) {
    throw new Error("No workspace access.");
  }
  return user as CurrentUser & { orgId: string };
}

export type ClientRow = {
  id: string;
  name: string;
  status: "lead" | "active" | "paused" | "churned";
  planName: string | null;
  planPricePence: number | null;
  retainerOverridePence: number | null;
  currency: string;
  createdAt: Date;
};

export async function listClients(): Promise<ClientRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: clients.id,
      name: clients.name,
      status: clients.status,
      planName: servicePlans.name,
      planPricePence: servicePlans.pricePence,
      retainerOverridePence: clients.retainerOverridePence,
      currency: clients.currency,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .leftJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
    .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
    .orderBy(asc(clients.name));
  // Retainer fees are revenue: hidden without the see-money capability.
  if (!user.capabilities.has("can_see_money")) {
    return (rows as ClientRow[]).map((r) => ({ ...r, planPricePence: null, retainerOverridePence: null }));
  }
  return rows as ClientRow[];
}

export async function getClient(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: clients.id,
      name: clients.name,
      status: clients.status,
      planName: servicePlans.name,
      planPricePence: servicePlans.pricePence,
      planCode: servicePlans.code,
      retainerOverridePence: clients.retainerOverridePence,
      currency: clients.currency,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .leftJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
    .where(and(eq(clients.id, id), eq(clients.orgId, user.orgId)))
    .limit(1);
  return row ?? null;
}

export async function listPlanOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: servicePlans.id, name: servicePlans.name, pricePence: servicePlans.pricePence })
    .from(servicePlans)
    .where(and(eq(servicePlans.orgId, user.orgId), isNull(servicePlans.archivedAt)))
    .orderBy(asc(servicePlans.sortOrder));
}

export const clientInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  status: z.enum(["lead", "active", "paused", "churned"]).default("lead"),
  servicePlanId: z.string().uuid().nullable().optional(),
  retainerOverridePence: z.number().int().nonnegative().nullable().optional(),
});
export type ClientInput = z.infer<typeof clientInput>;

export async function createClient(input: ClientInput) {
  const user = await requireUser();
  const data = clientInput.parse(input);
  const [row] = await getDb()
    .insert(clients)
    .values({
      orgId: user.orgId,
      name: data.name,
      status: data.status,
      servicePlanId: data.servicePlanId ?? null,
      retainerOverridePence: data.retainerOverridePence ?? null,
    })
    .returning({ id: clients.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "client.created",
    entityType: "client",
    entityId: row.id,
    meta: { name: data.name },
  });
  return row;
}
