"use server";
import { revalidatePath } from "next/cache";
import { updateWorkspaceDetails, updateWorkspaceName } from "@/lib/data/settings";

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

export async function updateWorkspaceDetailsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await updateWorkspaceDetails({
      logoUrl: String(formData.get("logoUrl") ?? "").trim(),
      vatNumber: String(formData.get("vatNumber") ?? "").trim(),
      addressText: String(formData.get("addressText") ?? "").trim(),
      billingEmail: String(formData.get("billingEmail") ?? "").trim(),
      defaultCurrency: String(formData.get("defaultCurrency") ?? "GBP").trim(),
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
}
