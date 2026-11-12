"use server";
import { revalidatePath } from "next/cache";
import {
  archiveServicePlan,
  createServicePlan,
  updateServicePlan,
} from "@/lib/data/service-plans";

export type PackagesActionState = { ok?: boolean; error?: string };

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

function revalidate(): void {
  revalidatePath("/settings");
  revalidatePath("/today");
}

export async function createPlanAction(
  _prev: PackagesActionState,
  formData: FormData,
): Promise<PackagesActionState> {
  try {
    const billing = String(formData.get("billing") ?? "monthly") === "bespoke"
      ? "bespoke"
      : "monthly";
    const bespoke = formData.get("bespoke") != null || billing === "bespoke";
    await createServicePlan({
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      pricePence: bespoke ? null : poundsToPence(formData.get("price")),
      billing,
      mostPopular: formData.get("mostPopular") != null,
      bespoke,
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create package." };
  }
}

export async function updatePlanAction(
  _prev: PackagesActionState,
  formData: FormData,
): Promise<PackagesActionState> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing package reference.");
    const billing = String(formData.get("billing") ?? "monthly") === "bespoke"
      ? "bespoke"
      : "monthly";
    const bespoke = formData.get("bespoke") != null || billing === "bespoke";
    await updateServicePlan(id, {
      name: String(formData.get("name") ?? "").trim(),
      pricePence: bespoke ? null : poundsToPence(formData.get("price")),
      mostPopular: formData.get("mostPopular") != null,
      bespoke,
      billing,
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save package." };
  }
}

export async function archivePlanAction(
  formData: FormData,
): Promise<PackagesActionState> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing package reference.");
    await archiveServicePlan(id);
    revalidate();
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not remove package." };
  }
}
