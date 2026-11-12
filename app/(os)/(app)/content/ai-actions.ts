"use server";

import { getContentItem } from "@/lib/data/content";
import { runAssist } from "@/lib/ai/claude";
import type { ContentChannel } from "@/lib/data/content";
import { getClientProfile } from "@/lib/data/client-brain";

type AiActionResult = { ok: true; text: string } | { ok: false; error: string };

const CHANNEL_LABEL: Record<ContentChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  other: "social media",
};

/** Build the shared context block from a content item for AI prompts. */
function itemContext(item: {
  title: string;
  channel: ContentChannel;
  clientName: string | null;
}): string {
  const lines = [
    `Title / brief: ${item.title}`,
    `Channel: ${CHANNEL_LABEL[item.channel]}`,
  ];
  if (item.clientName) lines.push(`Client: ${item.clientName}`);
  return lines.join("\n");
}

/** The client's brand profile, if one exists, so suggestions fit their niche. */
async function brandContext(clientId: string | null): Promise<string> {
  if (!clientId) return "";
  const profile = await getClientProfile(clientId).catch(() => null);
  if (!profile) return "";
  const lines = [
    profile.brandSummary ? `Brand: ${profile.brandSummary}` : "",
    profile.audience ? `Audience: ${profile.audience}` : "",
    profile.pillars?.length ? `Content pillars: ${profile.pillars.join(", ")}` : "",
  ].filter(Boolean);
  return lines.length ? `\n\n${lines.join("\n")}` : "";
}

/**
 * Draft an on-brand caption for a content item. Org-scoped via getContentItem.
 * Degrades gracefully: any failure (e.g. a missing ANTHROPIC_API_KEY) returns
 * { ok: false, error } rather than throwing.
 */
export async function draftCaptionAction(itemId: string): Promise<AiActionResult> {
  try {
    const item = await getContentItem(itemId);
    if (!item) throw new Error("Content item not found.");
    const text = await runAssist({
      system:
        "You write punchy, on-brand social captions for a creative agency. British English. Return just the caption, no hashtags, no preamble.",
      prompt: `Write a caption for this piece of content:\n\n${itemContext(item)}${await brandContext(item.clientId)}`,
      maxTokens: 400,
    });
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft a caption.",
    };
  }
}

/**
 * Suggest hashtags for a content item. Org-scoped via getContentItem.
 * Degrades gracefully to { ok: false, error } on any failure.
 */
export async function suggestHashtagsAction(itemId: string): Promise<AiActionResult> {
  try {
    const item = await getContentItem(itemId);
    if (!item) throw new Error("Content item not found.");
    const text = await runAssist({
      system:
        "Suggest 8-12 lowercase hashtags as a single space-separated line, and nothing else. Make them specific to this post's topic, the client's niche and its audience: mostly niche and mid-sized tags someone interested in the subject would actually follow, plus one or two for the location or brand where relevant. Do not use generic reach-bait tags such as #fyp, #foryou, #foryoupage, #viral, #trending, #explore, #newpost or tags that only name the platform.",
      prompt: `Suggest hashtags for this piece of content:\n\n${itemContext(item)}${await brandContext(item.clientId)}`,
      maxTokens: 400,
    });
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not suggest hashtags.",
    };
  }
}
