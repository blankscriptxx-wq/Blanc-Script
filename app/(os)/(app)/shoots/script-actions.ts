"use server";

import { revalidatePath } from "next/cache";
import { aiConfigured } from "@/lib/ai/claude";
import { writeScripts } from "@/lib/data/script-writer";
import { createScript, scriptHome, setScriptStatus } from "@/lib/data/scripts";

type Result = { ok: boolean; error: string };
type Home = { shootId?: string | null; projectId?: string | null };
type Style = "crew" | "self";

function refresh() {
  revalidatePath("/shoots", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/edits");
  revalidatePath("/content");
  revalidatePath("/today");
}

/** Write a script yourself, straight onto a shoot or project. */
export async function addScriptAction(home: Home, input: { title: string; body: string; notes?: string; style?: Style }): Promise<Result> {
  try {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the script a title." };
    const where = await scriptHome(home);
    await createScript({ ...where, title, body: input.body.trim() || null, notes: input.notes?.trim() || null, status: "draft", style: input.style === "self" ? "self" : "crew" });
    refresh();
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add the script." };
  }
}

/** Draft one or more scripts with AI from a short brief, onto a shoot or project. */
export async function generateScriptsAction(home: Home, brief: string, count = 1, style?: Style): Promise<Result> {
  try {
    if (!aiConfigured()) return { ok: false, error: "AI writing isn't switched on yet. You can still write the script yourself." };
    const where = await scriptHome(home);
    const titles = await writeScripts({ ...where, instruction: brief, count: Math.min(count, 5), style: style ?? null });
    if (!titles.length) return { ok: false, error: "Nothing came back. Try a more specific brief." };
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
