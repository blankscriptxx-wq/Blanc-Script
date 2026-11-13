import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { runStructured } from "@/lib/ai/claude";
import { getDb } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { buildBrainContext } from "@/lib/data/client-brain";
import { createScript } from "@/lib/data/scripts";

const FORMAT = `Write the body as timed beats so it reads cleanly on a call sheet. Each beat starts with a heading line like "0–5s · HOOK", followed by one line per instruction, each starting with one of these labels exactly: "Camera:", "Visual:", "Sound:", "SAY:", "Cut:". Put every spoken line on its own "SAY:" line, in quotation marks. Separate beats with a blank line. No markdown.`;

const FORMATS = ["reel", "tiktok", "youtube_short", "youtube_long", "ad", "other"] as const;
const BATCH = 3;

const text = (description: string) => ({ type: "string", description });
const SCHEMA = {
  type: "object",
  properties: {
    scripts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: text("Short title"),
          format: { type: "string", enum: ["reel", "tiktok", "youtube_short", "youtube_long", "ad"] },
          hookVisual: text("What we see in the first 1–2 seconds"),
          hookScript: text("The opening spoken line"),
          body: text("The full script as timed beats with labelled lines"),
          notes: text('Short lines such as "Setting: …", "Mood: …", "Length: …"'),
          memory: text("2–3 sentences: core idea, hook, visual device, call to action"),
        },
        required: ["title", "hookVisual", "hookScript", "body", "memory"],
      },
    },
  },
  required: ["scripts"],
};

type Drafted = { title: string; format?: string; hookVisual?: string; hookScript?: string; body?: string; notes?: string; memory?: string };

/** The project new scripts for a client belong to: this month's, else the latest live one. */
export async function currentProjectFor(clientId: string): Promise<{ id: string; name: string } | null> {
  const user = await requireUser();
  const rows = await getDb()
    .select({ id: projects.id, name: projects.name, period: projects.period })
    .from(projects)
    .where(
      and(eq(projects.orgId, user.orgId), eq(projects.clientId, clientId), isNull(projects.archivedAt), inArray(projects.status, ["planning", "active"])),
    )
    .orderBy(desc(projects.createdAt));
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const hit = rows.find((r) => r.period === period) ?? rows[0];
  return hit ? { id: hit.id, name: hit.name } : null;
}

/**
 * Draft `count` scripts for a client and save them as drafts. `instruction`
 * is the brief, or the planning conversation they were agreed in. Written a
 * few at a time; each batch sees everything written before it, so nothing in
 * the run repeats either.
 */
export async function writeScripts(input: {
  clientId: string;
  projectId?: string | null;
  shootId?: string | null;
  instruction: string;
  count: number;
  fromPlan?: boolean;
}): Promise<string[]> {
  const total = Math.min(Math.max(Math.round(input.count) || 1, 1), 10);
  const titles: string[] = [];
  for (let done = 0; done < total; done += BATCH) {
    const n = Math.min(BATCH, total - done);
    // Re-read the memory each time: it now includes the scripts just written.
    const context = await buildBrainContext(input.clientId);
    const which = input.fromPlan
      ? `Write scripts ${done + 1}${n > 1 ? `–${done + n}` : ""} of the ${total} agreed in the conversation, exactly as agreed (ideas, angles, order, length, settings). Do not swap in different ideas.`
      : `Write ${n} distinct script${n === 1 ? "" : "s"}${done ? ` (numbers ${done + 1}–${done + n} of ${total}; the earlier ones are already in the script memory)` : ""}.`;
    const out = await runStructured<{ scripts: Drafted[] }>({
      name: "save_scripts",
      schema: SCHEMA,
      system: `You are a short-form video scriptwriter for this client. ${which} About 30 seconds each unless told otherwise. Each needs a strong VISUAL hook (what we see in the first 1–2 seconds) and a SCRIPT hook (the opening spoken line). ${FORMAT}\n\nSave them with save_scripts. format is one of reel|tiktok|youtube_short|youtube_long|ad. notes holds short lines such as "Setting: …", "Mood: …", "Length: …". memory is 2–3 sentences recording this script's core idea, hook, visual device and call to action, so it is never written again. British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: input.instruction.trim() || "Pitch strong new ideas for this client.",
      maxTokens: 2600 * n + 600,
    });
    for (const s of (out.scripts ?? []).slice(0, n)) {
      const title = (s.title || "Untitled script").slice(0, 200);
      await createScript({
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        shootId: input.shootId ?? null,
        title,
        format: FORMATS.find((f) => f === s.format) ?? "reel",
        status: "draft",
        hookVisual: s.hookVisual?.slice(0, 1000) ?? null,
        hookScript: s.hookScript?.slice(0, 1000) ?? null,
        body: s.body?.slice(0, 8000) ?? null,
        notes: s.notes?.slice(0, 2000) ?? null,
        memory: s.memory?.slice(0, 1200) ?? null,
      });
      titles.push(title);
    }
  }
  return titles;
}
