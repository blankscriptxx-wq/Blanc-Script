"use server";

import { aiConfigured, runAssist } from "@/lib/ai/claude";
import { getTalentProfile } from "@/lib/data/talent-profile";

/**
 * AI helpers for the Talent module. Every action is wrapped in try/catch and
 * returns a discriminated result so the UI never throws. Org-scoping is enforced
 * by getTalentProfile, which calls requireUser underneath.
 */
export type TalentAiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const BIO_SYSTEM =
  "You write a short, professional on-camera talent bio for a casting/book profile. British English, 2-3 sentences.";

const OUTREACH_SYSTEM =
  "You write a short, friendly booking-enquiry message on behalf of a video agency. British English, warm and professional, 2-3 sentences. Follow the 'Recipient' instruction exactly: it says who the message is written to. Return the message only.";

const NOT_CONNECTED =
  "The AI assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.";

/**
 * Draft a short on-camera bio from the talent's name, skills/tags and base
 * location. Returns the bio text for the user to review and copy.
 */
export async function draftTalentBioAction(
  talentId: string,
): Promise<TalentAiResult> {
  try {
    if (!aiConfigured()) {
      return { ok: false, error: NOT_CONNECTED };
    }
    const profile = await getTalentProfile(talentId);
    if (!profile) {
      return { ok: false, error: "That talent was not found in your workspace." };
    }
    const { name, tags, baseLocation } = profile.talent;
    const prompt = [
      `Name: ${name}`,
      `Skills / tags: ${tags.length ? tags.join(", ") : "—"}`,
      `Base location: ${baseLocation ?? "—"}`,
    ].join("\n");
    const text = await runAssist({ system: BIO_SYSTEM, prompt });
    if (!text) {
      return { ok: false, error: "The assistant returned an empty bio. Try again." };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the bio.",
    };
  }
}

/**
 * Draft a short, friendly booking-enquiry message to the talent (or their
 * agent). Returns the message text for the user to review and copy.
 */
export async function draftOutreachAction(
  talentId: string,
): Promise<TalentAiResult> {
  try {
    if (!aiConfigured()) {
      return { ok: false, error: NOT_CONNECTED };
    }
    const profile = await getTalentProfile(talentId);
    if (!profile) {
      return { ok: false, error: "That talent was not found in your workspace." };
    }
    const { name, tags, baseLocation, agentName } = profile.talent;
    const prompt = [
      `Talent name: ${name}`,
      `Representation: ${agentName ? `via agent ${agentName}` : "no agent on file — contact the talent directly"}`,
      `Skills / tags: ${tags.length ? tags.join(", ") : "—"}`,
      `Base location: ${baseLocation ?? "—"}`,
      agentName
        ? `Recipient: the agent, ${agentName}. Open with "Hi ${agentName}," and ask about booking ${name}, referring to ${name} by name.`
        : `Recipient: ${name} themself. Open with "Hi ${name.split(" ")[0]}," and speak to them directly as "you" throughout. Never refer to ${name} in the third person and never ask for "their" availability — ask for yours.`,
    ].join("\n");
    const text = await runAssist({ system: OUTREACH_SYSTEM, prompt });
    if (!text) {
      return { ok: false, error: "The assistant returned an empty message. Try again." };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the outreach message.",
    };
  }
}
