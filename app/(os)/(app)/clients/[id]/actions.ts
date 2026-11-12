"use server";

import { revalidatePath } from "next/cache";
import { addClientContact } from "@/lib/data/client-profile";

export async function addContactAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  const clientId = (formData.get("clientId") as string) || "";
  try {
    const str = (key: string) => {
      const v = (formData.get(key) as string) ?? "";
      const t = v.trim();
      return t ? t : null;
    };
    await addClientContact({
      clientId,
      name: (formData.get("name") as string) ?? "",
      roleTitle: str("roleTitle"),
      email: str("email"),
      phone: str("phone"),
      isPrimary: formData.get("isPrimary") != null,
    });
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add contact." };
  }
}
