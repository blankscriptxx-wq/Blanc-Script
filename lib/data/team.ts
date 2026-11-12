import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/data/clients";
import type { Role } from "@/lib/auth/roles";

/**
 * Team data access. The workspace's members: our `memberships` rows joined to
 * each person's identity in Neon Auth's `neon_auth."user"` table (a different
 * schema, outside our Drizzle model — joined via raw SQL). Org-scoped.
 */

export type MemberStatus = "invited" | "active" | "suspended";

export type MemberRow = {
  userId: string;
  name: string | null;
  email: string | null;
  role: Role;
  status: MemberStatus;
};

export async function listMembers(): Promise<MemberRow[]> {
  const user = await requireUser();
  const { rows } = await getDb().execute(sql`
    select
      m.user_id as "userId",
      m.role,
      m.status,
      u.name,
      u.email
    from memberships m
    join neon_auth."user" u on u.id = m.user_id
    where m.org_id = ${user.orgId}
    order by u.name
  `);
  return rows as MemberRow[];
}
