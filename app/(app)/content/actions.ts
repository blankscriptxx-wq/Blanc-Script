"use server";

import { revalidatePath } from "next/cache";
import { createContentItem } from "@/lib/data/content";
import type { ContentChannel, ContentStatus } from "@/lib/data/content";

export async function createContentAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    const scheduledForRaw = (formData.get("scheduledFor") as string) || "";
    const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;
    await createContentItem({
      title: (formData.get("title") as string) ?? "",
      clientId: clientId ? clientId : null,
      channel: ((formData.get("channel") as string) || "instagram") as ContentChannel,
      status: ((formData.get("status") as string) || "idea") as ContentStatus,
      scheduledFor:
        scheduledFor && !Number.isNaN(scheduledFor.getTime()) ? scheduledFor : null,
    });
    revalidatePath("/content");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add content." };
  }
}
