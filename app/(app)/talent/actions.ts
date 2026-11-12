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
    const dayPounds = ((formData.get("dayRate") as string) || "").trim();
    const dayRatePence = dayPounds === "" ? null : Math.round(Number(dayPounds) * 100);
    const tags = ((formData.get("tags") as string) || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const agentName = ((formData.get("agentName") as string) || "").trim();
    const agentContact = ((formData.get("agentContact") as string) || "").trim();
    const baseLocation = ((formData.get("baseLocation") as string) || "").trim();
    const instagram = ((formData.get("instagram") as string) || "").trim();
    const bankAccountName = ((formData.get("bankAccountName") as string) || "").trim();
    const bankSortCode = ((formData.get("bankSortCode") as string) || "").trim();
    const bankAccountNumber = ((formData.get("bankAccountNumber") as string) || "").trim();

    await createTalent({
      name: (formData.get("name") as string) ?? "",
      email: email ? email : null,
      phone: phone ? phone : null,
      status: ((formData.get("status") as string) || "active") as
        | "active"
        | "inactive"
        | "archived",
      ratePerHourPence,
      dayRatePence,
      tags,
      agentName: agentName ? agentName : null,
      agentContact: agentContact ? agentContact : null,
      baseLocation: baseLocation ? baseLocation : null,
      instagram: instagram ? instagram : null,
      bankAccountName: bankAccountName ? bankAccountName : null,
      bankSortCode: bankSortCode ? bankSortCode : null,
      bankAccountNumber: bankAccountNumber ? bankAccountNumber : null,
    });
    revalidatePath("/talent");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add talent." };
  }
}
