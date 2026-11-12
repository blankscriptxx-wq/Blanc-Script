"use server";

import { revalidatePath } from "next/cache";
import { createPortalLink, revokePortalLink } from "@/lib/data/portal";

export type PortalAdminResult = { ok: true } | { ok: false; error: string };

export async function createPortalLinkAction(clientId: string, label: string): Promise<PortalAdminResult> {
  try {
    await createPortalLink(clientId, label);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the link." };
  }
}

export async function revokePortalLinkAction(clientId: string, linkId: string): Promise<PortalAdminResult> {
  try {
    await revokePortalLink(linkId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not revoke the link." };
  }
}
