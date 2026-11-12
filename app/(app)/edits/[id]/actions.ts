"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addVersion,
  addReviewComment,
  setDeliverableStatus,
  resolveComment,
  unresolveComment,
} from "@/lib/data/deliverable-detail";
import {
  updateDeliverable,
  archiveDeliverable,
  type DeliverableStatus,
} from "@/lib/data/edits";

export type DetailActionState = { ok: boolean; error: string } | null;

/** Read a form value, returning null for empty strings (for nullable fields). */
function nullable(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string) || "";
  return v.trim() ? v : null;
}

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
    const timecode = nullable(formData, "timecodeSeconds");
    await addReviewComment({
      deliverableId,
      body: (formData.get("body") as string) ?? "",
      parentId: nullable(formData, "parentId"),
      timecodeSeconds: timecode ? Number(timecode) : null,
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

export async function updateDeliverableAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const id = (formData.get("id") as string) || "";
  try {
    const dueAt = nullable(formData, "dueAt");
    const reviewDueAt = nullable(formData, "reviewDueAt");
    await updateDeliverable(id, {
      title: (formData.get("title") as string) ?? "",
      dueAt: dueAt ? new Date(dueAt) : null,
      projectId: nullable(formData, "projectId"),
      clientId: nullable(formData, "clientId"),
      shootId: nullable(formData, "shootId"),
      versionLabel: nullable(formData, "versionLabel"),
      reviewerUserId: nullable(formData, "reviewerUserId"),
      reviewDueAt: reviewDueAt ? new Date(reviewDueAt) : null,
    });
    revalidatePath(`/edits/${id}`);
    revalidatePath("/edits");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not update deliverable." };
  }
}

export async function archiveDeliverableAction(formData: FormData): Promise<void> {
  const id = (formData.get("id") as string) || "";
  await archiveDeliverable(id);
  revalidatePath("/edits");
  redirect("/edits");
}

export async function resolveCommentAction(formData: FormData): Promise<void> {
  const commentId = (formData.get("commentId") as string) || "";
  const deliverableId = (formData.get("deliverableId") as string) || "";
  const resolved = (formData.get("resolved") as string) === "true";
  if (resolved) {
    await unresolveComment(commentId);
  } else {
    await resolveComment(commentId);
  }
  revalidatePath(`/edits/${deliverableId}`);
}
