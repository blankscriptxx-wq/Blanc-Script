"use server";
import { revalidatePath } from "next/cache";
import { addAvailability, removeAvailability } from "@/lib/data/talent";

export type AvailabilityActionState = { ok?: boolean; error?: string };

export async function addAvailabilityAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const talentId = String(formData.get("talentId") ?? "");
  const kind = (String(formData.get("kind") ?? "unavailable") as
    | "available"
    | "unavailable");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  try {
    if (!startDate || !endDate) return { error: "Pick a start and end date." };
    await addAvailability({
      talentId,
      kind,
      startDate,
      endDate,
      note: note || null,
    });
    revalidatePath(`/talent/${talentId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save." };
  }
}

export async function removeAvailabilityAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const talentId = String(formData.get("talentId") ?? "");
  if (id) await removeAvailability(id);
  if (talentId) revalidatePath(`/talent/${talentId}`);
}
