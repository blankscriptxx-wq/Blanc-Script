"use server";

import { revalidatePath } from "next/cache";
import { createInvoice } from "@/lib/data/finance";

export async function createInvoiceAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    const talentId = (formData.get("talentId") as string) || "";
    const number = ((formData.get("number") as string) || "").trim();
    const dueAt = (formData.get("dueAt") as string) || "";
    const amountPounds = Number.parseFloat((formData.get("amount") as string) || "");
    if (!Number.isFinite(amountPounds) || amountPounds < 0) {
      return { ok: false, error: "Enter a valid amount." };
    }
    await createInvoice({
      clientId: clientId ? clientId : null,
      talentId: talentId ? talentId : null,
      number: number ? number : null,
      amountPence: Math.round(amountPounds * 100),
      status: ((formData.get("status") as string) || "draft") as
        | "draft"
        | "sent"
        | "approved"
        | "paid"
        | "overdue",
      dueAt: dueAt ? new Date(dueAt) : null,
    });
    revalidatePath("/finance");
    revalidatePath("/talent");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not create invoice." };
  }
}
