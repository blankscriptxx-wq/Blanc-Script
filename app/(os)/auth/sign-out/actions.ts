"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export async function signOutAction() {
  await getAuth().signOut();
  redirect("/auth/sign-in");
}
