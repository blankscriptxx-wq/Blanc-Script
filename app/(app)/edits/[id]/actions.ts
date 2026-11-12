"use server";

import { revalidatePath } from "next/cache";
import {
  addVersion,
  addReviewComment,
  setDeliverableStatus,
} from "@/lib/data/deliverable-detail";
import type { DeliverableStatus } from "@/lib/data/edits";

export type DetailActionState = { ok: boolean; error: string } | null;

export async function addVersionAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const deliverableId = (formData.get("deliverableId") as string) || "";
  try {
    const previewUrl = (formData.get("previewUrl") as string) || "";
    const note = (formData.get("note") as string) || "";
    await addVersion({
      deliverableId,
      label: (formData.get("label") as string) ?? "",
      previewUrl: previewUrl ? previewUrl : null,
      note: note ? note : null,
    });
    revalidatePath(`/edits/${deliverableId}`);
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add version." };
  }
}

export async function postCommentAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const deliverableId = (formData.get("deliverableId") as string) || "";
  try {
    await addReviewComment({
      deliverableId,
      body: (formData.get("body") as string) ?? "",
    });
    revalidatePath(`/edits/${deliverableId}`);
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not post comment." };
  }
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const deliverableId = (formData.get("deliverableId") as string) || "";
  const status = (formData.get("status") as string) || "";
  await setDeliverableStatus(deliverableId, status as DeliverableStatus);
  revalidatePath(`/edits/${deliverableId}`);
}
