"use server";

import { revalidatePath } from "next/cache";
import { createPortalLink, revokePortalLink, sendPortalInvite } from "@/lib/data/portal";

export type PortalAdminResult = { ok: true; message?: string } | { ok: false; error: string };

const EMAIL_NOTE: Record<string, string> = {
  sent: "Invite emailed.",
  failed: "Access created, but the email could not be sent. Copy the link instead.",
  not_configured: "Access created. Email isn't connected yet, so copy the link and send it yourself.",
  no_email: "Link created.",
};

/** Give someone portal access; with an email it becomes a login and they're emailed an invite. */
export async function createPortalLinkAction(
  clientId: string,
  label: string,
  email?: string,
): Promise<PortalAdminResult> {
  try {
    const link = await createPortalLink(clientId, label, email);
    const status = link.email ? await sendPortalInvite(link.id) : "no_email";
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, message: EMAIL_NOTE[status] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the access." };
  }
}

export async function resendPortalInviteAction(clientId: string, linkId: string): Promise<PortalAdminResult> {
  try {
    const status = await sendPortalInvite(linkId);
    revalidatePath(`/clients/${clientId}`);
    return status === "sent"
      ? { ok: true, message: "Invite emailed." }
      : { ok: false, error: EMAIL_NOTE[status].replace("Access created. ", "").replace("Access created, but t", "T") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send the invite." };
  }
}

export async function revokePortalLinkAction(clientId: string, linkId: string): Promise<PortalAdminResult> {
  try {
    await revokePortalLink(linkId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not revoke the access." };
  }
}
