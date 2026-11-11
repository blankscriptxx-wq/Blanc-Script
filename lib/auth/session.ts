import {
  resolveCapabilities,
  type Capability,
  type CapabilityOverrides,
  type Role,
} from "./roles";

/**
 * Current-user resolution.
 *
 * PLACEHOLDER MODE (no auth provider wired yet): returns a local development
 * identity so the shell renders. When Clerk is wired (see docs/INTEGRATIONS_ROADMAP
 * and SYSTEM_ARCHITECTURE), `getCurrentUser()` reads the Clerk session + the
 * user's membership (org, role, capability overrides) and the DB enforces RLS.
 *
 * It never invents business data — only an identity — so no real records are faked.
 */

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  orgId: string;
  orgName: string;
  role: Role;
  capabilities: Set<Capability>;
  /** True until a real auth provider is connected. */
  placeholder: boolean;
};

export function authConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

const DEV_OVERRIDES: CapabilityOverrides = {};

/**
 * Returns the signed-in user, or a placeholder dev identity when no auth
 * provider is configured. Async so the Clerk-backed implementation is a drop-in.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!authConfigured()) {
    const role: Role = "owner";
    return {
      id: "dev-user",
      name: "Dev User",
      email: "dev@blancscript.local",
      orgId: "dev-org",
      orgName: "Blanc Script (dev)",
      role,
      capabilities: resolveCapabilities(role, DEV_OVERRIDES),
      placeholder: true,
    };
  }
  // TODO(wire-clerk): read Clerk auth() + membership, map to CurrentUser.
  throw new Error(
    "Auth is configured but the Clerk adapter is not wired yet. See docs/INTEGRATIONS_ROADMAP.md.",
  );
}

export function can(user: CurrentUser, capability: Capability): boolean {
  return user.capabilities.has(capability);
}
