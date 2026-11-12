"use server";

import { revalidatePath } from "next/cache";
import { acceptPublicProposal } from "@/lib/data/proposals";

export async function acceptProposalAction(
  token: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await acceptPublicProposal(token, name);
    revalidatePath(`/proposal/${token}`);
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return { ok: false, error: (e as { issues: { message: string }[] }).issues[0]?.message ?? "Please check your name." };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Could not accept the proposal." };
  }
}
