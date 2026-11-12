"use server";

import { revalidatePath } from "next/cache";
import { createShoot } from "@/lib/data/shoots";

export async function createShootAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    const scheduledAt = (formData.get("scheduledAt") as string) || "";
    const locationName = (formData.get("locationName") as string) || "";
    await createShoot({
      title: (formData.get("title") as string) ?? "",
      clientId: clientId ? clientId : null,
      scheduledAt: scheduledAt ? scheduledAt : null,
      locationName: locationName ? locationName : null,
    });
    revalidatePath("/shoots");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not book shoot." };
  }
}
