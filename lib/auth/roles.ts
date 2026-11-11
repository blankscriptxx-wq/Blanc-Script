/**
 * Roles & capabilities — the authorisation vocabulary.
 *
 * Source of truth for the full matrix: docs/USER_ROLES_AND_PERMISSIONS.md.
 * This module encodes a faithful default matrix for the app layer; the DATABASE
 * enforces the same via RLS reading `memberships.capabilities` (see
 * docs/SECURITY_AND_PRIVACY.md). Capabilities — not roles — are the real gate.
 */

export const INTERNAL_ROLES = [
  "owner",
  "ops",
  "account_manager",
  "editor",
  "filmer",
] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

export const EXTERNAL_ROLES = ["client_user", "talent_user"] as const;
export type ExternalRole = (typeof EXTERNAL_ROLES)[number];

export type Role = InternalRole | ExternalRole;

export const CAPABILITIES = [
  // Money & commercials
  "can_see_money", // revenue, invoices (D9: separate from margin)
  "can_see_margin", // cost & profit
  "can_invoice",
  "can_edit_fees",
  "can_contract",
  // Pay
  "can_see_staff_pay",
  "can_see_actor_pay",
  "can_pay_team", // prepare a pay run
  "can_approve_pay", // release it (D10: segregated from can_pay_team)
  // People & platform access
  "can_manage_users",
  "can_settings",
  "can_manage_client_logins",
  "can_view_audit",
  // Lifecycle
  "can_archive",
  "can_erase",
  "can_act", // create/update core records (shoots, tasks, clients…)
  "can_publish", // push social content live
  "can_deliver", // send deliveries/approvals to clients
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Default role → capability map. Individual users may override per-capability. */
export const ROLE_CAPABILITIES: Record<InternalRole, Capability[]> = {
  owner: [...CAPABILITIES], // owner holds all by default
  ops: [
    "can_see_money",
    "can_invoice",
    "can_edit_fees",
    "can_see_staff_pay",
    "can_see_actor_pay",
    "can_pay_team",
    "can_manage_users",
    "can_settings",
    "can_view_audit",
    "can_archive",
    "can_act",
    "can_publish",
    "can_deliver",
  ],
  account_manager: ["can_contract", "can_act", "can_deliver", "can_publish"],
  editor: ["can_act", "can_deliver"],
  filmer: ["can_act"],
};

/** External users carry NO internal capabilities; portals gate them by scope. */
export const EXTERNAL_CAPABILITIES: Capability[] = [];

export type CapabilityOverrides = Partial<Record<Capability, boolean>>;

/** Resolve the effective capability set for a membership. */
export function resolveCapabilities(
  role: Role,
  overrides: CapabilityOverrides = {},
): Set<Capability> {
  const base =
    role in ROLE_CAPABILITIES
      ? ROLE_CAPABILITIES[role as InternalRole]
      : EXTERNAL_CAPABILITIES;
  const set = new Set<Capability>(base);
  for (const [cap, on] of Object.entries(overrides) as [Capability, boolean][]) {
    if (on) set.add(cap);
    else set.delete(cap);
  }
  return set;
}

export function isExternalRole(role: Role): role is ExternalRole {
  return (EXTERNAL_ROLES as readonly string[]).includes(role);
}
