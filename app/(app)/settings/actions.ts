"use server";
import { revalidatePath } from "next/cache";
import { updateWorkspaceName } from "@/lib/data/settings";

export type SettingsActionState = { ok?: boolean; error?: string };

export async function renameWorkspaceAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const name = String(formData.get("name") ?? "").trim();
  try {
    await updateWorkspaceName({ name });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
}
