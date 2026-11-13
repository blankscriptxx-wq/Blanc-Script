"use server";

import { revalidatePath } from "next/cache";
import { addClientContact, setClientSelfShoot } from "@/lib/data/client-profile";

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

/** Switch a client between "our team films" and "they film themselves". */
export async function setSelfShootAction(clientId: string, selfShoot: boolean) {
  try {
    await setClientSelfShoot(clientId, selfShoot);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/shoots", "layout");
    revalidatePath("/projects", "layout");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not save that." };
  }
}
