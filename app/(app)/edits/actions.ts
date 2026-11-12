"use server";

import { revalidatePath } from "next/cache";
import { createDeliverable, type DeliverableStatus } from "@/lib/data/edits";

export async function createDeliverableAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const projectId = (formData.get("projectId") as string) || "";
    const clientId = (formData.get("clientId") as string) || "";
    const versionLabel = (formData.get("versionLabel") as string) || "";
    const previewUrl = (formData.get("previewUrl") as string) || "";
    const dueAt = (formData.get("dueAt") as string) || "";
    await createDeliverable({
      title: (formData.get("title") as string) ?? "",
      status: ((formData.get("status") as string) || "editing") as DeliverableStatus,
      projectId: projectId ? projectId : null,
      clientId: clientId ? clientId : null,
      versionLabel: versionLabel ? versionLabel : null,
      previewUrl: previewUrl ? previewUrl : null,
      dueAt: dueAt ? new Date(dueAt) : null,
    });
    revalidatePath("/edits");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add deliverable." };
  }
}
