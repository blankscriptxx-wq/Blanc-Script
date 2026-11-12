"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/clients";
import { connectStripeWebhook } from "@/lib/data/billing";
import { archiveTemplate, saveTemplate } from "@/lib/data/documents";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { stripeConfigured } from "@/lib/payments/stripe";
import { setFollowUpsEnabled } from "@/lib/data/followups";

export type SettingsResult = { ok: true; message: string } | { ok: false; error: string };

async function settingsUser() {
  const user = await requireUser();
  if (!user.capabilities.has("can_settings")) throw new Error("You do not have permission to change settings.");
  return user;
}

/** Register the OS with Stripe so payments and renewals arrive automatically. */
export async function connectStripeAction(): Promise<SettingsResult> {
  try {
    const user = await settingsUser();
    if (!stripeConfigured()) return { ok: false, error: "Add your Stripe secret key first." };
    await connectStripeWebhook(user.orgId);
    revalidatePath("/settings");
    return { ok: true, message: "Stripe is connected. Payments and renewals will now update the OS automatically." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not connect Stripe." };
  }
}

/** Send a test email to the signed-in person, to prove the mailbox works. */
export async function sendTestEmailAction(): Promise<SettingsResult> {
  try {
    const user = await settingsUser();
    if (!emailConfigured()) return { ok: false, error: "Email isn't connected yet." };
    const res = await sendEmail({
      orgId: user.orgId,
      to: user.email,
      subject: "Blanc Script OS — test email",
      heading: "Email is working",
      paragraphs: [
        `Hi ${user.name.split(" ")[0]},`,
        "This is a test from Blanc Script OS. If you're reading it, the OS can send email from your mailbox.",
      ],
      kind: "test",
    });
    return res.status === "sent"
      ? { ok: true, message: `Test email sent to ${user.email}.` }
      : { ok: false, error: res.error ?? "The email could not be sent." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send the test email." };
  }
}

export async function saveTemplateAction(id: string | null, name: string, body: string): Promise<SettingsResult> {
  try {
    await saveTemplate(id, { name, body });
    revalidatePath("/settings");
    return { ok: true, message: "Template saved." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the template." };
  }
}

export async function archiveTemplateAction(id: string): Promise<SettingsResult> {
  try {
    await archiveTemplate(id);
    revalidatePath("/settings");
    return { ok: true, message: "Template removed." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove the template." };
  }
}

/** Switch the daily follow-up emails on or off for this workspace. */
export async function setFollowUpsAction(on: boolean): Promise<SettingsResult> {
  try {
    const user = await settingsUser();
    await setFollowUpsEnabled(user.orgId, on);
    revalidatePath("/settings");
    return { ok: true, message: on ? "Follow-up emails are on." : "Follow-up emails are off." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not change the setting." };
  }
}
