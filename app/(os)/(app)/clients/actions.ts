"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/clients";
import { redirect } from "next/navigation";

export async function createClientAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  let newId: string | null = null;
  try {
    const planId = (formData.get("servicePlanId") as string) || "";
    const created = await createClient({
      name: (formData.get("name") as string) ?? "",
      status: ((formData.get("status") as string) || "lead") as
        | "lead"
        | "active"
        | "paused"
        | "churned",
      servicePlanId: planId ? planId : null,
    });
    revalidatePath("/clients");
    newId = (created as { id?: string } | undefined)?.id ?? null;
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add client." };
  }
  // Straight to the new client's page, where the next step is set-up.
  if (newId) redirect(`/clients/${newId}`);
  return { ok: true, error: "" };
}
