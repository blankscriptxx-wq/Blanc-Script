"use server";

import { revalidatePath } from "next/cache";
import { createTalent } from "@/lib/data/talent";

export async function createTalentAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  try {
    const email = ((formData.get("email") as string) || "").trim();
    const phone = ((formData.get("phone") as string) || "").trim();
    const ratePounds = ((formData.get("ratePerHour") as string) || "").trim();
    const ratePerHourPence =
      ratePounds === "" ? null : Math.round(Number(ratePounds) * 100);

    await createTalent({
      name: (formData.get("name") as string) ?? "",
      email: email ? email : null,
      phone: phone ? phone : null,
      status: ((formData.get("status") as string) || "active") as
        | "active"
        | "inactive"
        | "archived",
      ratePerHourPence,
    });
    revalidatePath("/talent");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add talent." };
  }
}
