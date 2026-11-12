"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/clients";

export async function createClientAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const planId = (formData.get("servicePlanId") as string) || "";
    await createClient({
      name: (formData.get("name") as string) ?? "",
      status: ((formData.get("status") as string) || "lead") as
        | "lead"
        | "active"
        | "paused"
        | "churned",
      servicePlanId: planId ? planId : null,
    });
    revalidatePath("/clients");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add client." };
  }
}
