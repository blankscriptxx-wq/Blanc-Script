"use server";

import { revalidatePath } from "next/cache";
import { createShoot, setShootProject } from "@/lib/data/shoots";

export async function createShootAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    const projectId = (formData.get("projectId") as string) || "";
    const scheduledAt = (formData.get("scheduledAt") as string) || "";
    const locationName = (formData.get("locationName") as string) || "";
    const talentIds = formData
      .getAll("talentIds")
      .map((v) => String(v))
      .filter(Boolean);
    await createShoot({
      title: (formData.get("title") as string) ?? "",
      clientId: clientId ? clientId : null,
      projectId: projectId ? projectId : null,
      scheduledAt: scheduledAt ? scheduledAt : null,
      locationName: locationName ? locationName : null,
      talentIds,
    });
    revalidatePath("/shoots");
    revalidatePath("/talent");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not book shoot." };
  }
}

/** Link a shoot to a project, or unlink it when no project is chosen. */
export async function setShootProjectAction(formData: FormData): Promise<void> {
  const shootId = String(formData.get("shootId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!shootId) return;
  await setShootProject(shootId, projectId || null);
  revalidatePath("/shoots");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}
