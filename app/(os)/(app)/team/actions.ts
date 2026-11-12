"use server";

import { revalidatePath } from "next/cache";
import {
  updateMemberRole,
  setMemberCapabilityOverride,
} from "@/lib/data/team-admin";
import { INTERNAL_ROLES, CAPABILITIES } from "@/lib/auth/roles";
import type { InternalRole, Capability } from "@/lib/auth/roles";

export type TeamActionState = { ok?: boolean; error?: string };

/** Change a member's role. Driven by a role <select>. */
export async function changeRoleAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!(INTERNAL_ROLES as readonly string[]).includes(role)) {
    return { error: "Unknown role." };
  }
  try {
    await updateMemberRole(membershipId, role as InternalRole);
    revalidatePath("/team");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change role." };
  }
}

/**
 * Toggle a per-capability override for a member.
 * `value` is 'on' | 'off' | 'default' ('default' clears the override).
 */
export async function toggleCapabilityAction(
  formData: FormData,
): Promise<void> {
  const membershipId = String(formData.get("membershipId") ?? "");
  const capability = String(formData.get("capability") ?? "");
  const value = String(formData.get("value") ?? "");
  if (!(CAPABILITIES as readonly string[]).includes(capability)) {
    throw new Error("Unknown capability.");
  }
  const override = value === "on" ? true : value === "off" ? false : null;
  await setMemberCapabilityOverride(membershipId, capability as Capability, override);
  revalidatePath("/team");
}
