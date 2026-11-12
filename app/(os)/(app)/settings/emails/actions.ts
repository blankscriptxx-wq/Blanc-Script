"use server";

import { revalidatePath } from "next/cache";
import { getEmailBody, resendEmail } from "@/lib/data/email-log";

export async function resendEmailAction(id: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const res = await resendEmail(id);
    revalidatePath("/settings/emails");
    return res.status === "sent"
      ? { ok: true, message: "Sent." }
      : { ok: false, error: res.status === "not_configured" ? "Email isn't connected." : (res.error ?? "It failed to send again.") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not resend." };
  }
}

export async function emailBodyAction(id: string): Promise<string> {
  return (await getEmailBody(id).catch(() => null)) ?? "This email's text is no longer available.";
}
