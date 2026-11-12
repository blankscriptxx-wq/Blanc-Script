"use server";

import { redirect } from "next/navigation";
import { claimPortalLogin, signInToPortal, signOutOfPortal } from "@/lib/data/portal";

export type PortalAuthState = { error?: string } | null;

/** First visit on an invite: set a name and password, then open the portal. */
export async function portalClaimAction(_prev: PortalAuthState, formData: FormData): Promise<PortalAuthState> {
  const token = String(formData.get("token") ?? "");
  try {
    await claimPortalLogin(token, String(formData.get("name") ?? ""), String(formData.get("password") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not set up your login." };
  }
  redirect(`/portal/${token}`);
}

export async function portalSignInAction(_prev: PortalAuthState, formData: FormData): Promise<PortalAuthState> {
  let home: string | null = null;
  try {
    home = await signInToPortal(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign you in." };
  }
  if (!home) {
    return { error: "You're signed in, but this account has no client portal. Please ask Blanc Script for an invite." };
  }
  redirect(home);
}

export async function portalSignOutAction(): Promise<void> {
  await signOutOfPortal();
  redirect("/portal");
}
