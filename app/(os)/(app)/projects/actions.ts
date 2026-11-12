"use server";

import { revalidatePath } from "next/cache";
import { createProject } from "@/lib/data/projects";

export async function createProjectAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const clientId = (formData.get("clientId") as string) || "";
    await createProject({
      name: (formData.get("name") as string) ?? "",
      status: ((formData.get("status") as string) || "planning") as
        | "planning"
        | "active"
        | "on_hold"
        | "complete"
        | "cancelled",
      clientId: clientId ? clientId : null,
    });
    revalidatePath("/projects");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add project." };
  }
}
