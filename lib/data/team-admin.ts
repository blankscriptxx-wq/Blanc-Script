import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { memberships, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import {
  INTERNAL_ROLES,
  CAPABILITIES,
  resolveCapabilities,
  type Capability,
  type Role,
  type CapabilityOverrides,
  type InternalRole,
} from "@/lib/auth/roles";
import type { MemberStatus } from "@/lib/data/team";

/**
 * Team administration — privileged mutations over `memberships`.
 *
 * Editing a person's role or their per-capability overrides. Every write is
 * org-scoped (via `requireUser`) AND gated on the caller holding
 * `can_manage_users`; the membership being edited must belong to the caller's
 * org. Changes are recorded in `activity_log`.
 */

const CAN_MANAGE: Capability = "can_manage_users";

const roleSchema = z.enum(INTERNAL_ROLES);
const capabilitySchema = z.enum(CAPABILITIES);
const membershipIdSchema = z.string().uuid("Invalid membership id.");

/** The resolved state of one capability for a member. */
export type MemberCapability = {
  capability: Capability;
  /** The effective (resolved) value the member actually carries. */
  effective: boolean;
  /** What the member's role grants by default. */
  roleDefault: boolean;
  /** True when an explicit per-member override is in force. */
  overridden: boolean;
  /** The override's value, or null when there is no override. */
  overrideValue: boolean | null;
};

export type MemberDetail = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: Role;
  status: MemberStatus;
  capabilities: MemberCapability[];
};

type RawMemberRow = {
  membershipId: string;
  userId: string;
  role: Role;
  status: MemberStatus;
  capabilities: Record<string, boolean> | null;
  name: string | null;
  email: string | null;
};

/** Build the per-capability breakdown (effective / default / overridden). */
function buildCapabilities(
  role: Role,
  overridesRaw: Record<string, boolean> | null,
): MemberCapability[] {
  const overrides = (overridesRaw ?? {}) as CapabilityOverrides;
  const roleDefaults = resolveCapabilities(role, {});
  const effective = resolveCapabilities(role, overrides);
  return CAPABILITIES.map((capability) => {
    const overridden = Object.prototype.hasOwnProperty.call(overrides, capability);
    return {
      capability,
      effective: effective.has(capability),
      roleDefault: roleDefaults.has(capability),
      overridden,
      overrideValue: overridden ? overrides[capability] ?? null : null,
    };
  });
}

function toDetail(row: RawMemberRow): MemberDetail {
  return {
    membershipId: row.membershipId,
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    capabilities: buildCapabilities(row.role, row.capabilities),
  };
}

/** All org members with their membership id and resolved capabilities. */
export async function getMemberDetails(): Promise<MemberDetail[]> {
  const user = await requireUser();
  const { rows } = await getDb().execute(sql`
    select
      m.id as "membershipId",
      m.user_id as "userId",
      m.role,
      m.status,
      m.capabilities,
      u.name,
      u.email
    from memberships m
    join neon_auth."user" u on u.id = m.user_id
    where m.org_id = ${user.orgId}
    order by u.name
  `);
  return (rows as RawMemberRow[]).map(toDetail);
}

/** A single member's detail (role + effective capabilities + overrides). */
export async function getMemberDetail(
  membershipId: string,
): Promise<MemberDetail | null> {
  const user = await requireUser();
  const id = membershipIdSchema.parse(membershipId);
  const { rows } = await getDb().execute(sql`
    select
      m.id as "membershipId",
      m.user_id as "userId",
      m.role,
      m.status,
      m.capabilities,
      u.name,
      u.email
    from memberships m
    join neon_auth."user" u on u.id = m.user_id
    where m.id = ${id} and m.org_id = ${user.orgId}
    limit 1
  `);
  const row = (rows as RawMemberRow[])[0];
  return row ? toDetail(row) : null;
}

/** Load a membership that MUST belong to the caller's org, or throw. */
async function loadOwnOrgMembership(orgId: string, membershipId: string) {
  const [row] = await getDb()
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      capabilities: memberships.capabilities,
    })
    .from(memberships)
    .where(and(eq(memberships.id, membershipId), eq(memberships.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("Member not found in this workspace.");
  return row;
}

/** Change a member's internal role. Privileged. */
export async function updateMemberRole(
  membershipId: string,
  role: InternalRole,
): Promise<void> {
  const user = await requireUser();
  if (!user.capabilities.has(CAN_MANAGE)) {
    throw new Error("You do not have permission to manage users.");
  }
  const id = membershipIdSchema.parse(membershipId);
  const nextRole = roleSchema.parse(role);

  const member = await loadOwnOrgMembership(user.orgId, id);
  if (member.role === nextRole) return;

  // Self-demotion guard: never let the sole owner demote themselves.
  if (member.userId === user.id && member.role === "owner" && nextRole !== "owner") {
    const [{ count }] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.orgId, user.orgId), eq(memberships.role, "owner")));
    if (count <= 1) {
      throw new Error("You are the only owner — promote another owner first.");
    }
  }

  await getDb()
    .update(memberships)
    .set({ role: nextRole, updatedAt: new Date() })
    .where(and(eq(memberships.id, id), eq(memberships.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "member.role_changed",
    entityType: "membership",
    entityId: id,
    meta: { userId: member.userId, from: member.role, to: nextRole },
  });
}

/**
 * Set or clear a per-member capability override.
 * `value` of `true`/`false` pins the capability on/off for this member;
 * `null` clears the override, falling back to the role default.
 * Privileged.
 */
export async function setMemberCapabilityOverride(
  membershipId: string,
  capability: Capability,
  value: boolean | null,
): Promise<void> {
  const user = await requireUser();
  if (!user.capabilities.has(CAN_MANAGE)) {
    throw new Error("You do not have permission to manage users.");
  }
  const id = membershipIdSchema.parse(membershipId);
  const cap = capabilitySchema.parse(capability);

  const member = await loadOwnOrgMembership(user.orgId, id);

  const next: Record<string, boolean> = { ...(member.capabilities ?? {}) };
  if (value === null) {
    delete next[cap];
  } else {
    next[cap] = value;
  }

  await getDb()
    .update(memberships)
    .set({ capabilities: next, updatedAt: new Date() })
    .where(and(eq(memberships.id, id), eq(memberships.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "member.capability_changed",
    entityType: "membership",
    entityId: id,
    meta: { userId: member.userId, capability: cap, value },
  });
}

// ── Granting and removing access ──────────────────────────────────────────

export type AwaitingUser = { userId: string; name: string | null; email: string | null; createdAt: Date };

/** People who have signed up but hold no membership in any workspace yet. */
export async function listAwaitingUsers(): Promise<AwaitingUser[]> {
  const user = await requireUser();
  if (!user.capabilities.has(CAN_MANAGE)) return [];
  const { rows } = await getDb().execute(sql`
    select u.id as "userId", u.name, u.email, u."createdAt" as "createdAt"
    from neon_auth."user" u
    where not exists (select 1 from memberships m where m.user_id = u.id)
      -- Client portal logins are not staff waiting to be let in.
      and not exists (select 1 from portal_links pl where pl.user_id = u.id)
    order by u."createdAt" desc
    limit 50
  `);
  return (rows as unknown as AwaitingUser[]).map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
}

/** Add a signed-up person to the workspace with a role. Privileged. */
export async function grantAccess(userId: string, role: InternalRole): Promise<void> {
  const user = await requireUser();
  if (!user.capabilities.has(CAN_MANAGE)) {
    throw new Error("You do not have permission to manage users.");
  }
  const id = z.string().uuid("Invalid user.").parse(userId);
  const nextRole = roleSchema.parse(role);
  if (nextRole === "owner" && user.role !== "owner") {
    throw new Error("Only an owner can add another owner.");
  }
  const { rows } = await getDb().execute(sql`
    select
      (select count(*)::int from neon_auth."user" u where u.id = ${id}) as "exists",
      (select count(*)::int from memberships m where m.user_id = ${id}) as "memberships"
  `);
  const check = rows[0] as { exists: number; memberships: number } | undefined;
  if (!check?.exists) throw new Error("That account was not found.");
  if (check.memberships > 0) throw new Error("That person already belongs to a workspace.");

  const [row] = await getDb()
    .insert(memberships)
    .values({ orgId: user.orgId, userId: id, role: nextRole, status: "active" })
    .returning({ id: memberships.id });

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "member.added",
    entityType: "membership",
    entityId: row.id,
    meta: { userId: id, role: nextRole },
  });
}

/** Suspend (remove access) or reactivate a member. Privileged. */
export async function setMemberStatus(
  membershipId: string,
  status: "active" | "suspended",
): Promise<void> {
  const user = await requireUser();
  if (!user.capabilities.has(CAN_MANAGE)) {
    throw new Error("You do not have permission to manage users.");
  }
  const id = membershipIdSchema.parse(membershipId);
  const next = z.enum(["active", "suspended"]).parse(status);
  const member = await loadOwnOrgMembership(user.orgId, id);
  if (member.userId === user.id && next === "suspended") {
    throw new Error("You can't suspend your own access.");
  }
  if (member.role === "owner" && user.role !== "owner") {
    throw new Error("Only an owner can change an owner's access.");
  }
  await getDb()
    .update(memberships)
    .set({ status: next, updatedAt: new Date() })
    .where(and(eq(memberships.id, id), eq(memberships.orgId, user.orgId)));
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: next === "suspended" ? "member.suspended" : "member.reactivated",
    entityType: "membership",
    entityId: id,
    meta: { userId: member.userId },
  });
}
