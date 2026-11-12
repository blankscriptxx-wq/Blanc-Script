"use server";

import { revalidatePath } from "next/cache";
import {
  addPortalComment,
  portalInvoiceId,
  resolvePortal,
  setPortalDecision,
} from "@/lib/data/portal";
import { syncInvoicePayment } from "@/lib/data/payments";

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
