"use server";
import { revalidatePath } from "next/cache";
import {
  addContentCasting,
  addProjectCasting,
  addShootCasting,
  removeContentCasting,
  removeProjectCasting,
  removeShootCasting,
} from "@/lib/data/castings";

export type CastingActionState = { ok?: boolean; error?: string };

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}
function poundsToPence(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
function toDate(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function assignShootTalentAction(
  _prev: CastingActionState,
  formData: FormData,
): Promise<CastingActionState> {
  try {
    await addShootCasting({
      shootId: str(formData, "shootId"),
      talentId: str(formData, "talentId"),
      roleName: optStr(formData, "roleName"),
      callTime: toDate(formData, "callTime"),
      agreedRatePence: poundsToPence(formData, "rate"),
      status: (str(formData, "status") || "pencilled") as
        | "pencilled"
        | "confirmed"
        | "released",
    });
    revalidatePath("/shoots");
    revalidatePath("/talent");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not assign talent." };
  }
}

export async function assignProjectTalentAction(
  _prev: CastingActionState,
  formData: FormData,
): Promise<CastingActionState> {
  try {
    await addProjectCasting({
      projectId: str(formData, "projectId"),
      talentId: str(formData, "talentId"),
      roleName: optStr(formData, "roleName"),
      agreedRatePence: poundsToPence(formData, "rate"),
    });
    revalidatePath("/projects");
    revalidatePath("/talent");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not assign talent." };
  }
}

export async function assignContentTalentAction(
  _prev: CastingActionState,
  formData: FormData,
): Promise<CastingActionState> {
  try {
    await addContentCasting({
      contentItemId: str(formData, "contentItemId"),
      talentId: str(formData, "talentId"),
      roleName: optStr(formData, "roleName"),
    });
    revalidatePath("/content");
    revalidatePath("/talent");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not assign talent." };
  }
}

export async function removeCastingAction(formData: FormData): Promise<void> {
  const kind = str(formData, "kind");
  const id = str(formData, "id");
  if (!id) return;
  if (kind === "shoot") await removeShootCasting(id);
  else if (kind === "project") await removeProjectCasting(id);
  else if (kind === "content") await removeContentCasting(id);
  revalidatePath("/shoots");
  revalidatePath("/projects");
  revalidatePath("/content");
  revalidatePath("/talent");
}
