"use server";

import { runAssist } from "@/lib/ai/claude";
import { getDeliverableDetail } from "@/lib/data/deliverable-detail";
import type { DeliverableStatus } from "@/lib/data/edits";

/**
 * AI review helpers for the Edits module. Each action is org-scoped via
 * getDeliverableDetail (which calls requireUser) and wraps the AI call in a
 * try/catch so the UI always receives a structured result. British English.
 */

export type AiActionResult = { ok: true; text: string } | { ok: false; error: string };

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  to_film: "To film",
  editing: "Editing",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
};

/**
 * Summarise a deliverable's review thread into a short, grouped and deduplicated
 * list of the changes requested.
 */
export async function summariseCommentsAction(
  deliverableId: string,
): Promise<AiActionResult> {
  try {
    const detail = await getDeliverableDetail(deliverableId);
    if (!detail) {
      return { ok: false, error: "Deliverable not found." };
    }

    const comments = detail.comments;
    if (comments.length === 0) {
      return { ok: false, error: "There are no review comments to summarise yet." };
    }

    const lines = comments
      .map((c) => {
        const author = c.authorName?.trim() || "Reviewer";
        const timecode =
          c.timecodeSeconds != null
            ? ` [at ${Math.floor(c.timecodeSeconds / 60)}:${String(
                c.timecodeSeconds % 60,
              ).padStart(2, "0")}]`
            : "";
        const resolved = c.resolvedAt ? " (resolved)" : "";
        return `- ${author}${timecode}${resolved}: ${c.body.trim()}`;
      })
      .join("\n");

    const prompt = `Deliverable: "${detail.deliverable.title}"

Here is the full review thread for this video. Summarise the changes requested.

${lines}`;

    const text = await runAssist({
      system:
        "You summarise a video review thread into a short, clear list of the changes requested, grouped and deduplicated. British English.",
      prompt,
    });

    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message || "Could not summarise the comments.",
    };
  }
}

/**
 * Draft a short, friendly, professional client-facing update email about the
 * deliverable's current status.
 */
export async function draftClientUpdateAction(
  deliverableId: string,
): Promise<AiActionResult> {
  try {
    const detail = await getDeliverableDetail(deliverableId);
    if (!detail) {
      return { ok: false, error: "Deliverable not found." };
    }

    const { title, status } = detail.deliverable;
    const statusLabel = STATUS_LABEL[status] ?? status;

    const prompt = `Draft a short client-facing update email about this video deliverable.

Title: "${title}"
Current status: ${statusLabel}

The email should be friendly and professional, let the client know where the deliverable currently stands, and keep it concise. Do not invent dates, names or details that are not provided.`;

    const text = await runAssist({
      system:
        "You draft short, friendly, professional client-facing update emails for a video production studio. British English.",
      prompt,
    });

    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message || "Could not draft the client update.",
    };
  }
}
