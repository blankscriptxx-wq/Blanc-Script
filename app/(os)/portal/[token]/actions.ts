"use server";

import { revalidatePath } from "next/cache";
import {
  addPortalComment,
  portalInvoiceId,
  resolvePortal,
  setPortalDecision,
} from "@/lib/data/portal";
import { syncInvoicePayment } from "@/lib/data/payments";
import { headers } from "next/headers";
import {
  billingPortalUrl,
  startSubscriptionCheckout,
  syncClientBilling,
  upgradeSubscription,
} from "@/lib/data/billing";
import { acceptPortalDocument } from "@/lib/data/documents";
import { confirmPortalUpload, createPortalUpload } from "@/lib/data/client-uploads";

export type PortalResult = { ok: true; message: string } | { ok: false; error: string };

const GONE = "This link is no longer active. Please ask Blanc Script for a new one.";

function refresh(token: string, deliverableId?: string) {
  revalidatePath(`/portal/${token}`);
  if (deliverableId) {
    revalidatePath(`/portal/${token}/edits/${deliverableId}`);
    revalidatePath(`/edits/${deliverableId}`);
  }
  revalidatePath("/edits");
  revalidatePath("/today");
}

export async function portalCommentAction(
  token: string,
  deliverableId: string,
  body: string,
  timecodeSeconds: number | null,
): Promise<PortalResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    await addPortalComment(ctx, deliverableId, { body, timecodeSeconds });
    refresh(token, deliverableId);
    return { ok: true, message: "Comment sent." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send your comment." };
  }
}

export async function portalDecisionAction(
  token: string,
  deliverableId: string,
  decision: "approved" | "changes_requested",
  note: string,
): Promise<PortalResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    if (decision === "changes_requested" && !note.trim()) {
      return { ok: false, error: "Tell us what you'd like changed." };
    }
    if (note.trim()) {
      await addPortalComment(ctx, deliverableId, { body: note, timecodeSeconds: null });
    }
    await setPortalDecision(ctx, deliverableId, decision);
    refresh(token, deliverableId);
    return {
      ok: true,
      message: decision === "approved" ? "Approved — thank you." : "Thanks — we'll get on with the changes.",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record your decision." };
  }
}

/** After paying, the client can confirm payment so the invoice shows as paid. */
export async function portalCheckPaymentAction(token: string, invoiceId: string): Promise<PortalResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    const id = await portalInvoiceId(ctx, invoiceId);
    if (!id) return { ok: false, error: "That invoice isn't available." };
    const result = await syncInvoicePayment(id, ctx.orgId);
    revalidatePath(`/portal/${token}`);
    revalidatePath("/finance");
    return result === "paid"
      ? { ok: true, message: "Payment received — thank you." }
      : { ok: false, error: "We haven't received a payment for this invoice yet." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not check the payment." };
  }
}

// ── Package & billing ─────────────────────────────────────────────────────

export type PortalUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Start paying for the package monthly: returns a Stripe Checkout address. */
export async function portalStartSubscriptionAction(token: string): Promise<PortalUrlResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    const url = await startSubscriptionCheckout(ctx.orgId, ctx.clientId, `/portal/${token}`);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the subscription." };
  }
}

/** Stripe's own page for updating the card on file. */
export async function portalManagePaymentAction(token: string): Promise<PortalUrlResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    return { ok: true, url: await billingPortalUrl(ctx.orgId, ctx.clientId, `/portal/${token}`) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not open payment settings." };
  }
}

export async function portalUpgradeAction(token: string, planId: string): Promise<PortalResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    await upgradeSubscription(ctx.orgId, ctx.clientId, planId, `${ctx.viewerName} (client)`);
    revalidatePath(`/portal/${token}`);
    revalidatePath(`/clients/${ctx.clientId}`);
    revalidatePath("/finance");
    return { ok: true, message: "Your package has been upgraded. Thank you!" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not upgrade your package." };
  }
}

/** After returning from Stripe: pull the new subscription/invoice in straight away. */
export async function portalRefreshBillingAction(token: string): Promise<void> {
  const ctx = await resolvePortal(token);
  if (!ctx) return;
  await syncClientBilling(ctx.orgId, ctx.clientId).catch(() => {});
  revalidatePath(`/portal/${token}`);
}

// ── Documents ─────────────────────────────────────────────────────────────

export async function portalAcceptDocumentAction(
  token: string,
  documentId: string,
  typedName: string,
): Promise<PortalResult> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await acceptPortalDocument(ctx, documentId, typedName, ip);
    revalidatePath(`/portal/${token}`);
    revalidatePath(`/portal/${token}/documents/${documentId}`);
    revalidatePath(`/clients/${ctx.clientId}`);
    return { ok: true, message: "Accepted — thank you." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record your acceptance." };
  }
}

// ── Sending files ─────────────────────────────────────────────────────────

export type PortalUploadTarget = { ok: true; assetId: string; uploadUrl: string } | { ok: false; error: string };

export async function portalPresignUploadAction(
  token: string,
  file: { fileName: string; mimeType: string | null; sizeBytes: number; note: string | null },
): Promise<PortalUploadTarget> {
  try {
    const ctx = await resolvePortal(token);
    if (!ctx) return { ok: false, error: GONE };
    const { assetId, uploadUrl } = await createPortalUpload(ctx, file);
    return { ok: true, assetId, uploadUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the upload." };
  }
}

export async function portalConfirmUploadAction(token: string, assetId: string): Promise<void> {
  const ctx = await resolvePortal(token);
  if (!ctx) return;
  await confirmPortalUpload(ctx, assetId);
  revalidatePath(`/portal/${token}`);
  revalidatePath(`/clients/${ctx.clientId}`);
}
