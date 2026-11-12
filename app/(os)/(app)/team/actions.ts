"use server";

import { revalidatePath } from "next/cache";
import {
  updateMemberRole,
  setMemberCapabilityOverride,
  grantAccess,
  setMemberStatus,
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

/** Add a signed-up person to the workspace with the chosen role. */
export async function grantAccessAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!(INTERNAL_ROLES as readonly string[]).includes(role)) {
    return { error: "Choose a role." };
  }
  try {
    await grantAccess(userId, role as InternalRole);
    revalidatePath("/team");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add this person." };
  }
}

/** Suspend or reactivate a member's access. */
export async function setMemberStatusAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const membershipId = String(formData.get("membershipId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "active" && status !== "suspended") return { error: "Unknown status." };
  try {
    await setMemberStatus(membershipId, status);
    revalidatePath("/team");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change access." };
  }
}

/** Reserve owner access for an email and send the branded sign-up invitation. */
export async function inviteOwnerAction(email: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const { inviteOwnerByEmail } = await import("@/lib/data/team-admin");
    const status = await inviteOwnerByEmail(email);
    revalidatePath("/team");
    return status === "sent"
      ? { ok: true, message: `Invitation emailed to ${email.trim().toLowerCase()}.` }
      : { ok: false, error: status === "not_configured" ? "Their owner access is reserved, but email isn't connected so nothing was sent." : "Their owner access is reserved, but the email failed to send." };
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) return { ok: false, error: (e as { issues: { message: string }[] }).issues[0]?.message ?? "Check the email address." };
    return { ok: false, error: e instanceof Error ? e.message : "Could not send the invitation." };
  }
}
