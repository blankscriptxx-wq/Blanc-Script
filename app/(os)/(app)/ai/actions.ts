"use server";
import { aiConfigured, runAssist } from "@/lib/ai/claude";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayStats } from "@/lib/data/today";
import { getNeedsYou, getRecentActivity } from "@/lib/data/today-feed";

export type AssistantResult = { ok: true; text: string } | { ok: false; error: string };

const SYSTEM = `You are Blanc Script AI, the in-app assistant for a creative agency's operating system.
You are grounded ONLY in the workspace context provided with each question. Rules:
- Answer in British English, concise and practical.
- Use ONLY the data in the context block. If the answer isn't there, say what you'd need or suggest where to look in the app (Today, Clients, Projects, Shoots, Edits, Content, Finance, Team, Talent).
- Never invent clients, numbers, invoices or names.
- You cannot take actions (you don't move money, send messages or change records) — if asked, explain how the user can do it in the app.
- Keep answers short unless asked to draft something.`;

async function buildContext(): Promise<string> {
  const [stats, needs, activity] = await Promise.all([
    getTodayStats().catch(() => null),
    getNeedsYou().catch(() => null),
    getRecentActivity().catch(() => null),
  ]);
  const lines: string[] = [];
  if (stats) {
    lines.push(
      `KPIs — clients: ${stats.clients}, active projects: ${stats.activeProjects}, upcoming shoots: ${stats.upcomingShoots}, open tasks: ${stats.openTasks}.`,
    );
  }
  if (needs?.items?.length) {
    lines.push("Needs attention:");
    for (const it of needs.items.slice(0, 12)) {
      lines.push(`- [${it.kind}] ${it.title}${it.meta ? ` (${it.meta})` : ""}`);
    }
  }
  if (activity?.length) {
    lines.push("Recent activity:");
    for (const a of activity.slice(0, 10)) lines.push(`- ${a.label} — ${a.when}`);
  }
  return lines.join("\n") || "(No workspace data available.)";
}

export async function askAssistantAction(question: string): Promise<AssistantResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.hasAccess) return { ok: false, error: "No workspace access." };
    if (!aiConfigured()) {
      return {
        ok: false,
        error: "The assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.",
      };
    }
    const q = question.trim().slice(0, 2000);
    if (!q) return { ok: false, error: "Ask a question first." };
    const context = await buildContext();
    const text = await runAssist({
      system: SYSTEM,
      prompt: `Workspace context:\n${context}\n\nQuestion: ${q}`,
      maxTokens: 1200,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The assistant hit an error." };
  }
}
