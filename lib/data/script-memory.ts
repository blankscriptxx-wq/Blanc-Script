import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { aiConfigured, runJson } from "@/lib/ai/claude";
import { getDb } from "@/lib/db/client";
import { scripts } from "@/lib/db/schema";
import { parseScript } from "@/lib/scripts/breakdown";

/**
 * Script memory. Every script a client has ever had is remembered: a short,
 * stored note of its idea, hook and angle (kept for good, however many there
 * are), plus the full text of as many as fit. The AI is given all of it every
 * time it plans or writes, with a standing rule never to repeat one.
 */

/** Full scripts handed to the AI, newest first, up to roughly this many characters. */
const FULL_TEXT_BUDGET = 120_000;

type Row = { id: string; title: string; status: string; hookVisual: string | null; hookScript: string | null; body: string | null; notes: string | null; memory: string | null };

const fullText = (s: Row) =>
  [s.hookVisual ? `Opening shot: ${s.hookVisual}` : null, s.hookScript ? `Opening line: ${s.hookScript}` : null, s.body, s.notes ? `Notes: ${s.notes}` : null]
    .filter(Boolean)
    .join("\n");

/** A memory made without AI: the hook and every spoken line. */
function plainMemory(s: Row): string {
  const said = parseScript(s.body)
    .flatMap((b) => b.lines.filter((l) => l.kind === "say").map((l) => l.text))
    .join(" ");
  return [s.hookScript ? `Hook: ${s.hookScript}` : null, s.hookVisual ? `Opens on: ${s.hookVisual}` : null, said ? `Says: ${said}` : (s.body ?? "").slice(0, 400)]
    .filter(Boolean)
    .join(" ")
    .slice(0, 900);
}

/** Write the stored memory for any script that doesn't have one yet. */
async function remember(rows: Row[]): Promise<void> {
  const missing = rows.filter((r) => !r.memory && (r.body || r.hookScript));
  if (!missing.length) return;
  const made = new Map<string, string>();
  if (aiConfigured()) {
    // A few at a time keeps each request small and quick.
    for (let i = 0; i < missing.length; i += 12) {
      const batch = missing.slice(i, i + 12);
      try {
        const out = await runJson<{ memories: { n: number; memory: string }[] }>({
          system:
            'You keep a scriptwriter\'s memory of past video scripts so none is ever repeated. For each script write a memory of 2–3 sentences: the core idea and angle, the hook (what we see and the opening line), the setting or visual device, and the call to action. Be specific enough that a near-copy would be recognised. Return JSON {memories: [{n, memory}]} using each script\'s number.',
          prompt: batch.map((s, n) => `### Script ${n + 1}: ${s.title}\n${fullText(s).slice(0, 6000)}`).join("\n\n"),
          maxTokens: 220 * batch.length + 200,
        });
        for (const m of out.memories ?? []) {
          const s = batch[m.n - 1];
          if (s && typeof m.memory === "string" && m.memory.trim()) made.set(s.id, m.memory.trim().slice(0, 1200));
        }
      } catch {
        // Fall through to the plain memory below.
      }
    }
  }
  const db = getDb();
  for (const s of missing) {
    const memory = made.get(s.id) ?? plainMemory(s);
    s.memory = memory;
    await db.update(scripts).set({ memory }).where(eq(scripts.id, s.id));
  }
}

/** Everything the AI should remember about this client's scripts. */
export async function scriptMemoryContext(orgId: string, clientId: string): Promise<string> {
  const rows: Row[] = await getDb()
    .select({
      id: scripts.id,
      title: scripts.title,
      status: scripts.status,
      hookVisual: scripts.hookVisual,
      hookScript: scripts.hookScript,
      body: scripts.body,
      notes: scripts.notes,
      memory: scripts.memory,
    })
    .from(scripts)
    .where(and(eq(scripts.orgId, orgId), eq(scripts.clientId, clientId), isNull(scripts.archivedAt)))
    .orderBy(desc(scripts.createdAt));
  if (!rows.length) return "";
  await remember(rows).catch(() => null);

  const lines: string[] = [
    `SCRIPT MEMORY — all ${rows.length} scripts ever written for this client. NEVER repeat any of them: no reused idea, angle, hook, opening line, visual device or structure-with-new-words. Every new script must be clearly different from every one of these.`,
  ];
  rows.forEach((s, i) => lines.push(`${i + 1}. ${s.title} (${s.status}) — ${s.memory ?? plainMemory(s)}`));

  let used = 0;
  const full: string[] = [];
  for (const s of rows) {
    const text = fullText(s);
    if (!text) continue;
    if (used + text.length > FULL_TEXT_BUDGET) break;
    used += text.length;
    full.push(`=== ${s.title} (${s.status}) ===\n${text}`);
  }
  if (full.length) {
    lines.push(
      full.length === rows.length
        ? "FULL TEXT of every script (approved and filmed ones show the house style — match their structure, pacing and level of camera direction, never their content):"
        : `FULL TEXT of the ${full.length} most recent scripts (older ones are in the memory list above):`,
    );
    lines.push(...full);
  }
  return lines.join("\n");
}
