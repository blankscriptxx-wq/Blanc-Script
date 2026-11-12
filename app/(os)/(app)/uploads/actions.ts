"use server";
import { revalidatePath } from "next/cache";
import {
  confirmUpload,
  createUploadTarget,
  removeMedia,
  type UploadTargetInput,
} from "@/lib/data/media";

export type PresignResult =
  | { ok: true; assetId: string; uploadUrl: string }
  | { ok: false; error: string };

export async function presignUploadAction(
  input: UploadTargetInput,
): Promise<PresignResult> {
  try {
    const { assetId, uploadUrl } = await createUploadTarget(input);
    return { ok: true, assetId, uploadUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start upload." };
  }
}

export async function confirmUploadAction(assetId: string): Promise<void> {
  await confirmUpload(assetId);
  revalidatePath("/shoots");
  revalidatePath("/projects");
  revalidatePath("/edits");
  revalidatePath("/content");
}

export async function removeMediaAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removeMedia(id);
  revalidatePath("/shoots");
  revalidatePath("/projects");
  revalidatePath("/edits");
  revalidatePath("/content");
}
