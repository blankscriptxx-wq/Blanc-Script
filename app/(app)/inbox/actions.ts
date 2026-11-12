"use server";

import { revalidatePath } from "next/cache";
import {
  createConversation,
  sendMessage,
  setConversationStatus,
  type WaStatus,
} from "@/lib/data/inbox";

export async function createConversationAction(
  _prev: { ok: boolean; error: string; id?: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    const row = await createConversation({
      contactName: (formData.get("contactName") as string) ?? "",
      contactPhone: ((formData.get("contactPhone") as string) || "").trim(),
      clientId: clientId ? clientId : null,
    });
    revalidatePath("/inbox");
    return { ok: true, error: "", id: row.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not start the conversation." };
  }
}

export async function sendMessageAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    await sendMessage(
      (formData.get("conversationId") as string) ?? "",
      (formData.get("body") as string) ?? "",
    );
    revalidatePath("/inbox");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not save the message." };
  }
}

export async function setStatusAction(formData: FormData) {
  try {
    await setConversationStatus(
      (formData.get("id") as string) ?? "",
      ((formData.get("status") as string) || "open") as WaStatus,
    );
    revalidatePath("/inbox");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not update the status." };
  }
}
