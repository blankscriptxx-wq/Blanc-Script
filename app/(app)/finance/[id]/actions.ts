"use server";

import { revalidatePath } from "next/cache";
import {
  addLineItem,
  removeLineItem,
  setInvoiceStatus,
  syncInvoiceAmountToLines,
} from "@/lib/data/invoice-detail";
import type { InvoiceStatus } from "@/lib/data/finance";

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
