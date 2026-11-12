"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addLineItem,
  archiveInvoice,
  removeLineItem,
  setInvoiceStatus,
  syncInvoiceAmountToLines,
  updateInvoice,
  type UpdateInvoiceInput,
} from "@/lib/data/invoice-detail";
import type { InvoiceStatus } from "@/lib/data/finance";
import { checkInvoicePayment, createInvoicePaymentLink } from "@/lib/data/payments";

export type LineItemActionState = { ok?: boolean; error?: string };

const STATUSES: InvoiceStatus[] = ["draft", "sent", "approved", "paid", "overdue"];

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function addLineItemAction(
  _prev: LineItemActionState,
  formData: FormData,
): Promise<LineItemActionState> {
  try {
    const invoiceId = str(formData, "invoiceId");
    const description = str(formData, "description");
    if (!description) return { error: "Enter a description." };

    const quantity = Number.parseInt(str(formData, "quantity") || "1", 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: "Quantity must be a whole number of 1 or more." };
    }
    const unitPounds = Number.parseFloat(str(formData, "unit"));
    if (!Number.isFinite(unitPounds) || unitPounds < 0) {
      return { error: "Enter a valid unit price." };
    }

    await addLineItem({
      invoiceId,
      description,
      quantity,
      unitPence: Math.round(unitPounds * 100),
    });
    await syncInvoiceAmountToLines(invoiceId);

    revalidatePath(`/finance/${invoiceId}`);
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add line item." };
  }
}

export async function removeLineItemAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const invoiceId = str(formData, "invoiceId");
  if (!id) return;
  await removeLineItem(id);
  if (invoiceId) await syncInvoiceAmountToLines(invoiceId);
  if (invoiceId) revalidatePath(`/finance/${invoiceId}`);
  revalidatePath("/finance");
}

export async function setInvoiceStatusAction(formData: FormData): Promise<void> {
  const invoiceId = str(formData, "invoiceId");
  const status = str(formData, "status") as InvoiceStatus;
  if (!invoiceId || !STATUSES.includes(status)) return;
  await setInvoiceStatus(invoiceId, status);
  revalidatePath(`/finance/${invoiceId}`);
  revalidatePath("/finance");
}

export type UpdateInvoiceActionState = { ok?: boolean; error?: string };

export async function updateInvoiceAction(
  _prev: UpdateInvoiceActionState,
  formData: FormData,
): Promise<UpdateInvoiceActionState> {
  try {
    const invoiceId = str(formData, "invoiceId");
    if (!invoiceId) return { error: "Missing invoice." };

    const status = str(formData, "status");
    const taxRaw = str(formData, "taxRatePct");

    const patch: UpdateInvoiceInput = {
      number: str(formData, "number") || null,
      clientId: str(formData, "clientId") || null,
      talentId: str(formData, "talentId") || null,
      status: STATUSES.includes(status as InvoiceStatus)
        ? (status as InvoiceStatus)
        : undefined,
      issuedAt: str(formData, "issuedAt") ? new Date(str(formData, "issuedAt")) : null,
      dueAt: str(formData, "dueAt") ? new Date(str(formData, "dueAt")) : null,
      taxRatePct: taxRaw ? Number.parseInt(taxRaw, 10) : null,
      paymentUrl: str(formData, "paymentUrl") || null,
      reference: str(formData, "reference") || null,
      terms: str(formData, "terms") || null,
    };

    await updateInvoice(invoiceId, patch);
    revalidatePath(`/finance/${invoiceId}`);
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update invoice." };
  }
}

export async function voidInvoiceAction(formData: FormData): Promise<void> {
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId) return;
  await archiveInvoice(invoiceId);
  revalidatePath(`/finance/${invoiceId}`);
  revalidatePath("/finance");
  redirect("/finance");
}

export type PaymentActionResult =
  | { ok: true; message: string; url?: string }
  | { ok: false; error: string };

/** Create (or replace) the Stripe payment link for an invoice. */
export async function createPaymentLinkAction(invoiceId: string): Promise<PaymentActionResult> {
  try {
    const { url } = await createInvoicePaymentLink(invoiceId);
    revalidatePath(`/finance/${invoiceId}`);
    return { ok: true, message: "Payment link ready.", url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the payment link." };
  }
}

/** Ask Stripe whether the invoice has been paid; marks it paid if so. */
export async function checkPaymentAction(invoiceId: string): Promise<PaymentActionResult> {
  try {
    const result = await checkInvoicePayment(invoiceId);
    revalidatePath(`/finance/${invoiceId}`);
    revalidatePath("/finance");
    return {
      ok: true,
      message:
        result === "paid"
          ? "Paid — the invoice has been marked as paid."
          : result === "no_link"
            ? "No payment link yet."
            : "Not paid yet.",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not check the payment." };
  }
}
