"use server";

import { getContentItem } from "@/lib/data/content";
import { runAssist } from "@/lib/ai/claude";
import type { ContentChannel } from "@/lib/data/content";

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
      prompt: `Write a caption for this piece of content:\n\n${itemContext(item)}`,
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
        "Suggest 8-12 relevant, lowercase hashtags as a single space-separated line.",
      prompt: `Suggest hashtags for this piece of content:\n\n${itemContext(item)}`,
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
