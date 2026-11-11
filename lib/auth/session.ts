import { eq } from "drizzle-orm";
import { auth } from "./server";
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
  const { data: session } = await auth.getSession();
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
      .where(eq(memberships.userId, u.id))
      .limit(1);
    row = rows[0];
  } catch {
    row = undefined;
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
    hasAccess: true,
  };
}

export function can(user: CurrentUser, capability: Capability): boolean {
  return user.capabilities.has(capability);
}
