"use server";
import { revalidatePath } from "next/cache";
import {
  addContentCasting,
  addProjectCasting,
  addShootCasting,
  checkShootClash,
  removeContentCasting,
  removeProjectCasting,
  removeShootCasting,
  setShootCastingRating,
} from "@/lib/data/castings";

export type CastingActionState = { ok?: boolean; error?: string; warning?: string };

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

function hoursToMinutes(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60);
}

function toInt(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export async function assignShootTalentAction(
  _prev: CastingActionState,
  formData: FormData,
): Promise<CastingActionState> {
  try {
    const shootId = str(formData, "shootId");
    const talentId = str(formData, "talentId");
    await addShootCasting({
      shootId,
      talentId,
      roleName: optStr(formData, "roleName"),
      callTime: toDate(formData, "callTime"),
      agreedRatePence: poundsToPence(formData, "rate"),
      durationMinutes: hoursToMinutes(formData, "hours"),
      rateMode: (str(formData, "rateMode") || "hourly") as "hourly" | "day",
      dayCount: toInt(formData, "dayCount"),
      costOwner: (str(formData, "costOwner") || "client") as "client" | "agency",
      status: (str(formData, "status") || "pencilled") as
        | "pencilled"
        | "confirmed"
        | "released",
    });
    revalidatePath("/shoots");
    revalidatePath("/talent");
    // Soft clash warning — the booking still goes through.
    const clash = await checkShootClash(shootId, talentId);
    const warnings: string[] = [];
    if (clash.unavailable) warnings.push("marked unavailable on this date");
    if (clash.dayClash) warnings.push("already booked on another shoot that day");
    return warnings.length
      ? { ok: true, warning: `Heads up: this talent is ${warnings.join(" and ")}.` }
      : { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not assign talent." };
  }
}

export async function setRatingAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const r = str(formData, "rating");
  if (!id) return;
  await setShootCastingRating(id, r === "" ? null : Number(r));
  revalidatePath("/shoots");
  revalidatePath("/talent");
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

/** Warn before casting: is this person unavailable, or already booked, that day? */
export async function checkShootClashAction(
  shootId: string,
  talentId: string,
): Promise<{ unavailable: boolean; dayClash: boolean }> {
  try {
    return await checkShootClash(shootId, talentId);
  } catch {
    return { unavailable: false, dayClash: false };
  }
}
