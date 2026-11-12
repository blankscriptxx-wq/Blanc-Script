"use server";

import { redirect } from "next/navigation";
import { claimPortalLogin, signInToPortal, signOutOfPortal } from "@/lib/data/portal";

export type PortalAuthState = { error?: string; email?: string; name?: string } | null;

/** First visit on an invite: set a name and password, then open the portal. */
export async function portalClaimAction(_prev: PortalAuthState, formData: FormData): Promise<PortalAuthState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "");
  try {
    await claimPortalLogin(token, name, String(formData.get("password") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not set up your login.", name };
  }
  redirect(`/portal/${token}`);
}

export async function portalSignInAction(_prev: PortalAuthState, formData: FormData): Promise<PortalAuthState> {
  const email = String(formData.get("email") ?? "");
  let home: string | null = null;
  try {
    home = await signInToPortal(email, String(formData.get("password") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign you in.", email };
  }
  if (!home) {
    return {
      error: "You're signed in, but this account has no client portal. Please ask Blanc Script for an invite.",
      email,
    };
  }
  redirect(home);
}

export async function portalSignOutAction(): Promise<void> {
  await signOutOfPortal();
  redirect("/portal");
}
