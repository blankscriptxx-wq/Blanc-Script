"use server";

import { revalidatePath } from "next/cache";
import {
  cancelOnboarding,
  remindOnboarding,
  saveOnboarding,
  sendOnboarding,
  sendBalanceInvoiceNow,
  type OnboardingInput,
} from "@/lib/data/onboarding";
import { markInvoicePaidDirect, recordDirectPayment, type DirectMethod } from "@/lib/data/cash";

export type OnboardingResult = { ok: true; message: string; inviteUrl?: string } | { ok: false; error: string };

const fail = (e: unknown, fallback: string): OnboardingResult => {
  if (e && typeof e === "object" && "issues" in e) {
    const issues = (e as { issues: { message: string }[] }).issues;
    return { ok: false, error: issues[0]?.message ?? fallback };
  }
  return { ok: false, error: e instanceof Error ? e.message : fallback };
};

const EMAIL_NOTE: Record<string, string> = {
  sent: "Welcome email sent.",
  failed: "Everything is set up, but the email failed to send — copy the link below and send it yourself.",
  not_configured: "Everything is set up. Email isn't connected yet, so copy the link below and send it yourself.",
};

function refresh(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/finance");
}

export async function saveOnboardingAction(clientId: string, input: OnboardingInput): Promise<OnboardingResult> {
  try {
    await saveOnboarding(clientId, input);
    refresh(clientId);
    return { ok: true, message: "Saved as a draft. Nothing has been sent yet." };
  } catch (e) {
    return fail(e, "Could not save.");
  }
}

/** Save, then apply the agreement and email the welcome. */
export async function sendOnboardingAction(clientId: string, input: OnboardingInput | null): Promise<OnboardingResult> {
  try {
    if (input) await saveOnboarding(clientId, input);
    const res = await sendOnboarding(clientId);
    refresh(clientId);
    return { ok: true, message: EMAIL_NOTE[res.emailStatus] ?? "Done.", inviteUrl: res.inviteUrl };
  } catch (e) {
    return fail(e, "Could not send the welcome.");
  }
}

export async function remindOnboardingAction(clientId: string): Promise<OnboardingResult> {
  try {
    const res = await remindOnboarding(clientId);
    refresh(clientId);
    if (!res) return { ok: true, message: "Nothing left to chase — they've finished." };
    return res.status === "sent"
      ? { ok: true, message: "Reminder sent." }
      : { ok: false, error: res.status === "not_configured" ? "Email isn't connected yet." : (res.error ?? "The reminder failed to send.") };
  } catch (e) {
    return fail(e, "Could not send the reminder.");
  }
}

export async function cancelOnboardingAction(clientId: string): Promise<OnboardingResult> {
  try {
    await cancelOnboarding(clientId);
    refresh(clientId);
    return { ok: true, message: "Onboarding cancelled." };
  } catch (e) {
    return fail(e, "Could not cancel.");
  }
}

/** The client paid an invoice in cash or by bank transfer: mark it paid (no Stripe involved). */
export async function markPaidDirectAction(clientId: string, invoiceId: string, method: DirectMethod): Promise<OnboardingResult> {
  try {
    await markInvoicePaidDirect(invoiceId, method);
    refresh(clientId);
    revalidatePath(`/finance/${invoiceId}`);
    return { ok: true, message: "Marked as paid. The client can see the paid invoice in their portal." };
  } catch (e) {
    return fail(e, "Could not mark it paid.");
  }
}

/** Record money received directly: creates a paid invoice for the client. */
export async function recordDirectPaymentAction(
  clientId: string,
  input: { description?: string; amountPence: number; method: DirectMethod },
): Promise<OnboardingResult> {
  try {
    const { number } = await recordDirectPayment(clientId, input);
    refresh(clientId);
    return { ok: true, message: `Recorded. Invoice ${number} created and marked paid.` };
  } catch (e) {
    return fail(e, "Could not record the payment.");
  }
}

/** Raise and email the balance invoice for a project that took a deposit. */
export async function sendBalanceInvoiceAction(clientId: string): Promise<OnboardingResult> {
  try {
    const sent = await sendBalanceInvoiceNow(clientId);
    refresh(clientId);
    return sent ? { ok: true, message: "Balance invoice sent to the client." } : { ok: false, error: "There's no balance to invoice." };
  } catch (e) {
    return fail(e, "Could not send the balance invoice.");
  }
}
