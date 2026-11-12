"use server";

import { runAssist } from "@/lib/ai/claude";
import { getShoot } from "@/lib/data/shoots";
import { listShootCastings } from "@/lib/data/castings";

/**
 * Inline AI helpers for the Shoots module. Each action is org-scoped via the
 * underlying data access (getShoot / listShootCastings both call requireUser),
 * and every call is wrapped in try/catch so an unconfigured assistant (runAssist
 * throws) or any failure returns { ok: false, error } rather than throwing.
 */

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeStyle: "short",
  timeZone: "Europe/London",
});

/** Draft a concise production call sheet for a shoot and its talent. */
export async function draftCallSheetAction(shootId: string): Promise<AiResult> {
  try {
    const shoot = await getShoot(shootId);
    if (!shoot) {
      return { ok: false, error: "That shoot was not found in your workspace." };
    }
    const talent = (await listShootCastings()).filter((c) => c.shootId === shootId);

    const lines = [
      `Shoot: ${shoot.title}`,
      `Client: ${shoot.clientName ?? "Not set"}`,
      `Date & time: ${shoot.scheduledAt ? dateFmt.format(new Date(shoot.scheduledAt)) : "Not scheduled"}`,
      `Location: ${shoot.locationName ?? "Not set"}`,
    ];
    if (talent.length) {
      lines.push("Talent:");
      for (const t of talent) {
        const role = t.roleName ? ` — ${t.roleName}` : "";
        const call = t.callTime ? ` (call ${timeFmt.format(new Date(t.callTime))})` : "";
        lines.push(`- ${t.talentName}${role}${call}`);
      }
    } else {
      lines.push("Talent: none booked yet");
    }

    const text = await runAssist({
      system:
        "You draft a concise production call sheet for a video shoot: date/time, location, client, talent with call times and roles, and a short run-of-day. British English.",
      prompt: `Draft a call sheet from these shoot details:\n\n${lines.join("\n")}`,
    });
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the call sheet.",
    };
  }
}

/** Draft a sensible starter shot list for a shoot. */
export async function draftShotListAction(shootId: string): Promise<AiResult> {
  try {
    const shoot = await getShoot(shootId);
    if (!shoot) {
      return { ok: false, error: "That shoot was not found in your workspace." };
    }

    const text = await runAssist({
      system:
        "You draft a sensible starter shot list for a video shoot, as a short bulleted list. British English.",
      prompt: `Draft a starter shot list for this shoot.\n\nTitle: ${shoot.title}\nClient: ${shoot.clientName ?? "Not set"}`,
    });
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the shot list.",
    };
  }
}
