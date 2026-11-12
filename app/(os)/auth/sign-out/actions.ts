"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { clearVerified } from "@/lib/auth/mfa";

export async function signOutAction() {
  await getAuth().signOut();
  // Signing out also forgets the second step on this browser.
  await clearVerified();
  redirect("/auth/sign-in");
}
