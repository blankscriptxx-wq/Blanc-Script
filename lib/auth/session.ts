import { isExternalRole } from "@/lib/auth/roles";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "./server";
import { getDb } from "@/lib/db/client";
import { memberships, organisations } from "@/lib/db/schema";
import { resolveCapabilities, type Capability, type Role } from "./roles";

/**
 * Current-user resolution via Neon Auth (Managed Better Auth).
 * The session gives identity; the org/role/capabilities come from our
 * `memberships` table. A signed-in user with no membership has no access yet
 * (awaiting an invite/grant) — we never fabricate a role or capabilities.
 */

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  orgId: string | null;
  orgName: string | null;
  role: Role | null;
  capabilities: Set<Capability>;
  /** True only when the user has an active membership in an org. */
  hasAccess: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: session } = await getAuth().getSession();
  const u = session?.user;
  if (!u) return null;

  let row:
    | {
        orgId: string;
        orgName: string | null;
        role: string;
        capabilities: Record<string, boolean> | null;
      }
    | undefined;
  try {
    const db = getDb();
    const rows = await db
      .select({
        orgId: memberships.orgId,
        orgName: organisations.name,
        role: memberships.role,
        capabilities: memberships.capabilities,
      })
      .from(memberships)
      .leftJoin(organisations, eq(memberships.orgId, organisations.id))
      // Invited or suspended memberships do not open the workspace.
      .where(and(eq(memberships.userId, u.id), eq(memberships.status, "active")))
      .limit(1);
    row = rows[0];
  } catch {
    row = undefined;
  }

  // An email the workspace has reserved as an owner gets its access the first
  // time that person signs in (they choose their own password at sign-up).
  if (!row && (await claimReservedOwner(u.id, u.email).catch(() => false))) {
    return getCurrentUser();
  }

  if (!row) {
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      orgId: null,
      orgName: null,
      role: null,
      capabilities: new Set(),
      hasAccess: false,
    };
  }

  const role = row.role as Role;
  return {
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    orgId: row.orgId,
    orgName: row.orgName,
    role,
    capabilities: resolveCapabilities(role, row.capabilities ?? {}),
    // The staff workspace is for internal roles only.
    hasAccess: !isExternalRole(role),
  };
}

type OwnerSettings = { ownerEmails?: string[]; masterEmail?: string; masterUserId?: string };

/**
 * Give a newly signed-up person the owner access reserved for their email.
 * Only for an account with no membership anywhere; each reservation is used
 * once. The master owner's account id is recorded so it can never be removed.
 */
async function claimReservedOwner(userId: string, email: string): Promise<boolean> {
  const mail = email.trim().toLowerCase();
  if (!mail) return false;
  const db = getDb();
  const [existing] = await db.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, userId)).limit(1);
  if (existing) return false;
  const [org] = await db
    .select({ id: organisations.id, settings: organisations.settings })
    .from(organisations)
    .where(sql`${organisations.settings} -> 'ownerEmails' ? ${mail}`)
    .limit(1);
  if (!org) return false;
  const settings = { ...((org.settings ?? {}) as Record<string, unknown>) } as Record<string, unknown> & OwnerSettings;
  settings.ownerEmails = (settings.ownerEmails ?? []).filter((e) => e !== mail);
  if (settings.masterEmail === mail) settings.masterUserId = userId;
  // Take the reservation first, so two sign-ins can't both claim it.
  const taken = await db
    .update(organisations)
    .set({ settings })
    .where(and(eq(organisations.id, org.id), sql`${organisations.settings} -> 'ownerEmails' ? ${mail}`))
    .returning({ id: organisations.id });
  if (!taken.length) return false;
  await db.insert(memberships).values({ orgId: org.id, userId, role: "owner", status: "active" });
  return true;
}

export function can(user: CurrentUser, capability: Capability): boolean {
  return user.capabilities.has(capability);
}
