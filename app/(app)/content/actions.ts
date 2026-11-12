"use server";

import { revalidatePath } from "next/cache";
import { createContentItem, updateContentItem } from "@/lib/data/content";
import type { ContentChannel, ContentStatus } from "@/lib/data/content";

/** Parse a datetime-local string into a Date, or null when blank/invalid. */
function parseScheduledFor(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createContentAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    const scheduledForRaw = (formData.get("scheduledFor") as string) || "";
    await createContentItem({
      title: (formData.get("title") as string) ?? "",
      clientId: clientId ? clientId : null,
      channel: ((formData.get("channel") as string) || "instagram") as ContentChannel,
      status: ((formData.get("status") as string) || "idea") as ContentStatus,
      scheduledFor: parseScheduledFor(scheduledForRaw),
    });
    revalidatePath("/content");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add content." };
  }
}

export async function updateContentAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const id = (formData.get("id") as string) || "";
    if (!id) throw new Error("Missing content item.");
    const clientId = (formData.get("clientId") as string) || "";
    const scheduledForRaw = (formData.get("scheduledFor") as string) || "";
    const link = ((formData.get("link") as string) || "").trim();
    await updateContentItem(id, {
      title: (formData.get("title") as string) ?? "",
      clientId: clientId ? clientId : null,
      channel: ((formData.get("channel") as string) || "instagram") as ContentChannel,
      status: ((formData.get("status") as string) || "idea") as ContentStatus,
      scheduledFor: parseScheduledFor(scheduledForRaw),
      body: ((formData.get("body") as string) || "") || null,
      hashtags: ((formData.get("hashtags") as string) || "") || null,
      link: link || null,
      notes: ((formData.get("notes") as string) || "") || null,
    });
    revalidatePath("/content");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not save changes." };
  }
}

/** Lightweight status change from the board/calendar drawer. */
export async function setContentStatusAction(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  if (!id) throw new Error("Missing content item.");
  await updateContentItem(id, {
    status: ((formData.get("status") as string) || "idea") as ContentStatus,
  });
  revalidatePath("/content");
}

/** Lightweight reschedule (id + new scheduledFor) from the drawer. */
export async function rescheduleContentAction(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  if (!id) throw new Error("Missing content item.");
  const scheduledForRaw = (formData.get("scheduledFor") as string) || "";
  await updateContentItem(id, {
    scheduledFor: parseScheduledFor(scheduledForRaw),
  });
  revalidatePath("/content");
}
