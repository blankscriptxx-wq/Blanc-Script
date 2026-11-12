"use server";
import { revalidatePath } from "next/cache";
import {
  archiveAddOn,
  createAddOn,
  updateAddOn,
  type AddonCadence,
} from "@/lib/data/addons";

export type AddonsActionState = { ok?: boolean; error?: string };

const CADENCES: readonly AddonCadence[] = [
  "monthly",
  "one_off",
  "hourly",
  "per_job",
  "bespoke",
];

function parseCadence(raw: FormDataEntryValue | null): AddonCadence {
  const v = String(raw ?? "monthly");
  return (CADENCES as readonly string[]).includes(v) ? (v as AddonCadence) : "monthly";
}

/** Parse a £ amount string into integer pence. "" / null → null. */
function poundsToPence(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim().replace(/[£,\s]/g, "");
  if (s === "") return null;
  const value = Number(s);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Enter a valid price in pounds.");
  }
  return Math.round(value * 100);
}

function parseSortOrder(raw: FormDataEntryValue | null): number | undefined {
  const s = String(raw ?? "").trim();
  if (s === "") return undefined;
  const value = Number(s);
  if (!Number.isInteger(value)) throw new Error("Sort order must be a whole number.");
  return value;
}

function emptyToNull(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "").trim();
  return s === "" ? null : s;
}

export async function createAddonAction(
  _prev: AddonsActionState,
  formData: FormData,
): Promise<AddonsActionState> {
  try {
    const cadence = parseCadence(formData.get("cadence"));
    await createAddOn({
      name: String(formData.get("name") ?? "").trim(),
      pricePence: cadence === "bespoke" ? null : poundsToPence(formData.get("price")),
      cadence,
      freeWithPlanCode: emptyToNull(formData.get("freeWithPlanCode")),
      notes: emptyToNull(formData.get("notes")),
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create add-on." };
  }
}

export async function updateAddonAction(
  _prev: AddonsActionState,
  formData: FormData,
): Promise<AddonsActionState> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing add-on reference.");
    const cadence = parseCadence(formData.get("cadence"));
    await updateAddOn(id, {
      name: String(formData.get("name") ?? "").trim(),
      pricePence: cadence === "bespoke" ? null : poundsToPence(formData.get("price")),
      cadence,
      freeWithPlanCode: emptyToNull(formData.get("freeWithPlanCode")),
      notes: emptyToNull(formData.get("notes")),
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save add-on." };
  }
}

export async function archiveAddonAction(
  formData: FormData,
): Promise<AddonsActionState> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing add-on reference.");
    await archiveAddOn(id);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not remove add-on." };
  }
}
