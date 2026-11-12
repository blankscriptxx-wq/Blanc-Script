"use server";

import { revalidatePath } from "next/cache";
import { aiConfigured, runAssist, runJson } from "@/lib/ai/claude";
import { getProjectProfile } from "@/lib/data/project-profile";
import { createTask } from "@/lib/data/tasks";
import { getClientProfile } from "@/lib/data/client-brain";

/**
 * AI helpers for the Projects module. Every action is wrapped in try/catch and
 * returns a discriminated result so the UI never throws. Org-scoping is enforced
 * by getProjectProfile/createTask, which both call requireUser underneath.
 */
export type ProjectAiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const BRIEF_SYSTEM =
  "You write a concise creative project brief for a video agency: objective, audience, deliverables, tone and key dates. Base it on the project and the client details given; do not invent facts about the client's business that aren't supplied. Plain text with short labelled sections, no Markdown symbols. British English.";

const TASKS_SYSTEM =
  "Break this project into 5-10 concrete production tasks for a video shoot/edit workflow. Tailor every task to this specific client and brief: use the client's actual business, products and constraints as given, and never assume a sector (for example a restaurant) that isn't stated. Return JSON {tasks:[{title}]}.";

/** What we know about the project's client, so drafts fit their business. */
async function clientContext(clientId: string | null, clientName: string | null): Promise<string> {
  const lines = [`Client: ${clientName ?? "—"}`];
  if (clientId) {
    const profile = await getClientProfile(clientId).catch(() => null);
    if (profile?.brandSummary) lines.push(`About the client: ${profile.brandSummary}`);
    if (profile?.audience) lines.push(`Audience: ${profile.audience}`);
    if (profile?.tone) lines.push(`Tone of voice: ${profile.tone}`);
    if (profile?.pillars?.length) lines.push(`Content pillars: ${profile.pillars.join(", ")}`);
    if (profile?.dosAndDonts) lines.push(`Do's and don'ts: ${profile.dosAndDonts}`);
    if (profile?.notes) lines.push(`Notes: ${profile.notes}`);
  }
  return lines.join("\n");
}

/**
 * Draft a creative brief from the project's name and client. Returns the brief
 * text for the user to review and copy into the brief field via the edit path.
 */
export async function draftBriefAction(
  projectId: string,
): Promise<ProjectAiResult> {
  try {
    if (!aiConfigured()) {
      return {
        ok: false,
        error:
          "The AI assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.",
      };
    }
    const profile = await getProjectProfile(projectId);
    if (!profile) {
      return { ok: false, error: "That project was not found in your workspace." };
    }
    const { name, clientId, clientName } = profile.project;
    const prompt = `Project name: ${name}\n${await clientContext(clientId, clientName)}`;
    const text = await runAssist({ system: BRIEF_SYSTEM, prompt });
    if (!text) {
      return { ok: false, error: "The assistant returned an empty brief. Try again." };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the brief.",
    };
  }
}

export type ProposeTasksResult =
  | { ok: true; tasks: string[] }
  | { ok: false; error: string };

/**
 * Turn the project's brief (or its name, if the brief is empty) into a set of
 * suggested production tasks. Read-only: nothing is added to the project until
 * the user approves them via addProposedTasksAction.
 */
export async function proposeTasksAction(projectId: string): Promise<ProposeTasksResult> {
  try {
    if (!aiConfigured()) {
      return {
        ok: false,
        error:
          "The AI assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.",
      };
    }
    const profile = await getProjectProfile(projectId);
    if (!profile) {
      return { ok: false, error: "That project was not found in your workspace." };
    }
    const { name, clientId, clientName } = profile.project;
    const brief = profile.project.brief?.trim();
    const result = await runJson<{ tasks: { title: string }[] }>({
      system: TASKS_SYSTEM,
      prompt: [
        `Project name: ${name}`,
        await clientContext(clientId, clientName),
        brief ? `Brief:\n${brief}` : "Brief: (none written yet)",
      ].join("\n"),
    });

    const tasks = (result?.tasks ?? [])
      .map((t) => (typeof t?.title === "string" ? t.title.trim().slice(0, 200) : ""))
      .filter((t): t is string => t.length > 0)
      .slice(0, 10);

    if (tasks.length === 0) {
      return { ok: false, error: "The assistant didn't return any tasks. Try again." };
    }
    return { ok: true, tasks };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not break the brief into tasks.",
    };
  }
}

/** Add the tasks the user approved to the project. */
export async function addProposedTasksAction(
  projectId: string,
  titles: string[],
): Promise<ProjectAiResult> {
  try {
    const clean = (Array.isArray(titles) ? titles : [])
      .map((t) => (typeof t === "string" ? t.trim().slice(0, 200) : ""))
      .filter((t) => t.length > 0)
      .slice(0, 10);
    if (clean.length === 0) return { ok: false, error: "Choose at least one task." };

    for (const title of clean) await createTask({ projectId, title });

    revalidatePath(`/projects/${projectId}`);
    const n = clean.length;
    return { ok: true, text: `Added ${n} task${n === 1 ? "" : "s"}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add the tasks." };
  }
}
