"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/clients";
import { startSubscriptionCheckout, syncClientBilling, upgradeSubscription } from "@/lib/data/billing";

export type BillingResult = { ok: true; message: string; url?: string } | { ok: false; error: string };

async function moneyUser() {
  const user = await requireUser();
  if (!user.capabilities.has("can_see_money")) {
    throw new Error("You do not have permission to manage billing.");
  }
  return user;
}

/** A Stripe Checkout link the client uses to start paying for their package monthly. */
export async function subscriptionLinkAction(clientId: string): Promise<BillingResult> {
  try {
    const user = await moneyUser();
    const url = await startSubscriptionCheckout(user.orgId, clientId, "/pay/thanks");
    return { ok: true, message: "Subscription link ready. It expires in 24 hours.", url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the link." };
  }
}

/** Pull this client's subscription and invoices from Stripe. */
export async function syncBillingAction(clientId: string): Promise<BillingResult> {
  try {
    const user = await moneyUser();
    const { invoices } = await syncClientBilling(user.orgId, clientId);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/finance");
    return {
      ok: true,
      message: invoices ? `Synced — ${invoices} new invoice${invoices === 1 ? "" : "s"} added.` : "Synced with Stripe.",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not sync with Stripe." };
  }
}

/** Move the client up to a dearer package (charged pro rata straight away). */
export async function staffUpgradeAction(clientId: string, planId: string): Promise<BillingResult> {
  try {
    const user = await moneyUser();
    await upgradeSubscription(user.orgId, clientId, planId, user.name);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/finance");
    return { ok: true, message: "Package upgraded." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not upgrade the package." };
  }
}
