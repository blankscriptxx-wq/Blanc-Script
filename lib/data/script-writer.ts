import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { runStructured } from "@/lib/ai/claude";
import { getDb } from "@/lib/db/client";
import { clients, projects } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { buildBrainContext } from "@/lib/data/client-brain";
import { createScript } from "@/lib/data/scripts";

const CREW_FORMAT = `Write the body as timed beats so it reads cleanly on a call sheet. Each beat starts with a heading line like "0–5s · HOOK", followed by one line per instruction, each starting with one of these labels exactly: "Camera:", "Visual:", "Sound:", "SAY:", "Cut:". Put every spoken line on its own "SAY:" line, in quotation marks. Separate beats with a blank line. No markdown.`;

const SELF_FORMAT = `The CLIENT films this themselves on a phone, usually alone, and is also the person on camera. They are not film-makers. Write the body as a simple numbered shot list they can follow one shot at a time and tick off.

ORDER THE SHOTS FOR EASY FILMING, NOT IN STORY ORDER. Group every shot that happens in the same place together, so they film everything in one spot in one go before moving on, even when those shots are far apart in the finished video (for example the opening line and the closing line, both to camera in the same spot, are filmed back to back). Within a place, put shots with the same phone position next to each other. Number the shots in this filming order.

Each shot is written exactly like this:
Shot 1 · Face the camera        (a plain three-to-six word name)
Where: Reception desk            (the place; identical wording for every shot filmed there)
Order: 1                         (this shot's position in the FINISHED video: 1 = first thing viewers see; every shot gets a different number)
Set-up: one sentence on where to put the phone and where to stand
Do: one sentence on what to do in the shot
SAY: "the exact words"           (leave this line out for a silent cutaway, and say "No talking" in Do)

Separate shots with a blank line. Use 4 to 8 shots. Everyday words only: no jargon such as gimbal, B-roll, push-in, orbit or locked-off — describe it instead. Every shot must be possible with one phone and no crew. Short sentences. No markdown. In notes, give lines "Length: …", "You need: …" (props or places) and one or two short "Tip: …" lines.`;

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
          body: text("The full script, laid out exactly as the format instructions say"),
          brief: text("Two or three plain sentences: the idea of the video and how the finished video runs from start to end, so whoever films or edits it understands it at a glance"),
          notes: text('Short lines such as "Setting: …", "Mood: …", "Length: …"'),
          memory: text("2–3 sentences: core idea, hook, visual device, call to action"),
        },
        required: ["title", "format", "brief", "hookVisual", "hookScript", "body", "notes", "memory"],
        additionalProperties: false,
      },
    },
  },
  required: ["scripts"],
  additionalProperties: false,
};

export type ScriptStyle = "crew" | "self";

/** How this client's scripts are written by default: for our crew, or for them to film. */
export async function clientScriptStyle(clientId: string): Promise<ScriptStyle> {
  const user = await requireUser();
  const [c] = await getDb()
    .select({ selfShoot: clients.selfShoot })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, user.orgId)))
    .limit(1);
  return c?.selfShoot ? "self" : "crew";
}

type Drafted = { brief?: string; title: string; format?: string; hookVisual?: string; hookScript?: string; body?: string; notes?: string; memory?: string };

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
  /** "self" writes a simple shot list for a client filming themselves. Defaults to the client's setting. */
  style?: ScriptStyle | null;
}): Promise<string[]> {
  const style: ScriptStyle = input.style ?? (await clientScriptStyle(input.clientId));
  const FORMAT = style === "self" ? SELF_FORMAT : CREW_FORMAT;
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
      schema: SCHEMA,
      system: `You are a short-form video scriptwriter for this client. ${which} About 30 seconds each unless told otherwise. Each needs a strong VISUAL hook (what we see in the first 1–2 seconds) and a SCRIPT hook (the opening spoken line). ${FORMAT}\n\nformat is one of reel|tiktok|youtube_short|youtube_long|ad. notes holds short lines such as "Setting: …", "Mood: …", "Length: …". memory is 2–3 sentences recording this script's core idea, hook, visual device and call to action, so it is never written again. British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: input.instruction.trim() || "Pitch strong new ideas for this client.",
      maxTokens: 16000,
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
        notes: [s.brief?.trim() ? `Brief: ${s.brief.trim().replace(/\s*\n\s*/g, " ")}` : null, s.notes?.trim()].filter(Boolean).join("\n").slice(0, 2000) || null,
        memory: s.memory?.slice(0, 1200) ?? null,
        style,
      });
      titles.push(title);
    }
  }
  return titles;
}
