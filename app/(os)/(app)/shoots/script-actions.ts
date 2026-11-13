"use server";

import { revalidatePath } from "next/cache";
import { aiConfigured, runJson } from "@/lib/ai/claude";
import { buildBrainContext } from "@/lib/data/client-brain";
import { createScript, scriptHome, setScriptStatus } from "@/lib/data/scripts";

type Result = { ok: boolean; error: string };
type Home = { shootId?: string | null; projectId?: string | null };

function refresh() {
  revalidatePath("/shoots", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/edits");
  revalidatePath("/content");
  revalidatePath("/today");
}

const FORMAT = `Write the body as timed beats so it reads cleanly on a call sheet. Each beat starts with a heading line like "0–5s · HOOK", followed by one line per instruction, each starting with one of these labels exactly: "Camera:", "Visual:", "Sound:", "SAY:", "Cut:". Put every spoken line on its own "SAY:" line, in quotation marks. Separate beats with a blank line. No markdown.`;

/** Write a script yourself, straight onto a shoot or project. */
export async function addScriptAction(home: Home, input: { title: string; body: string; notes?: string }): Promise<Result> {
  try {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the script a title." };
    const where = await scriptHome(home);
    await createScript({ ...where, title, body: input.body.trim() || null, notes: input.notes?.trim() || null, status: "draft" });
    refresh();
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add the script." };
  }
}

/** Draft one or more scripts with AI from a short brief, onto a shoot or project. */
export async function generateScriptsAction(home: Home, brief: string, count = 1): Promise<Result> {
  try {
    if (!aiConfigured()) return { ok: false, error: "AI writing isn't switched on yet. You can still write the script yourself." };
    const where = await scriptHome(home);
    const n = Math.min(Math.max(Math.round(count) || 1, 1), 5);
    const context = await buildBrainContext(where.clientId);
    const out = await runJson<{ scripts: { title: string; format?: string; hookVisual?: string; hookScript?: string; body?: string; notes?: string }[] }>({
      system: `You are a short-form video scriptwriter for this client. Using the client brain, write ${n} distinct script${n === 1 ? "" : "s"}, about 30 seconds each unless the brief says otherwise. Each needs a strong VISUAL hook (what we see in the first 1–2 seconds) and a SCRIPT hook (the opening spoken line). ${FORMAT} Return JSON {scripts: [{title, format, hookVisual, hookScript, body, notes}]}. format is one of reel|tiktok|youtube_short|youtube_long|ad. notes holds short lines such as "Setting: …", "Mood: …", "Length: …". British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: brief.trim() || "Pitch strong new ideas for this client.",
      maxTokens: 1400 * n + 400,
    });
    const list = (out.scripts ?? []).slice(0, n);
    if (!list.length) return { ok: false, error: "Nothing came back. Try a more specific brief." };
    const formats = ["reel", "tiktok", "youtube_short", "youtube_long", "ad", "other"] as const;
    for (const s of list) {
      await createScript({
        ...where,
        title: (s.title || "Untitled script").slice(0, 200),
        format: formats.find((f) => f === s.format) ?? "reel",
        status: "draft",
        hookVisual: s.hookVisual?.slice(0, 1000) ?? null,
        hookScript: s.hookScript?.slice(0, 1000) ?? null,
        body: s.body?.slice(0, 8000) ?? null,
        notes: s.notes?.slice(0, 2000) ?? null,
      });
    }
    refresh();
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not draft the script." };
  }
}

/** Approve a draft: it joins the plan as an edit "To film" and a content item. */
export async function approveScriptAction(scriptId: string): Promise<Result> {
  try {
    await setScriptStatus(scriptId, "approved");
    refresh();
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not approve the script." };
  }
}
