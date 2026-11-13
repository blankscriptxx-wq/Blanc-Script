"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { contentItems } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { aiConfigured, runChat, runJson, runResearch } from "@/lib/ai/claude";
import {
  buildBrainContext,
  getClientProfile,
  proposeKnowledge,
  setKnowledgeStatus,
  upsertClientProfile,
} from "@/lib/data/client-brain";
import {
  addMessage,
  createThread,
  ensureShootThread,
  otherConversations,
  getThreadClientId,
  getThreadMessages,
} from "@/lib/data/client-chat";
import {
  appendScriptNotes,
  archiveScript,
  createScript,
  getScript,
  pushScriptToContent,
  setScriptStatus,
} from "@/lib/data/scripts";
import { runClientResearch, setAutoResearch } from "@/lib/data/research-job";
import { clientScriptStyle, currentProjectFor, writeScripts } from "@/lib/data/script-writer";
import { getShootRunSheet } from "@/lib/data/shoots";

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

function path(clientId: string) {
  return `/clients/${clientId}/strategy`;
}

// ── Research (web) → seed profile + propose knowledge ─────────────────────────
export async function researchClientAction(clientId: string): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to run research." };
    const user = await requireUser();
    const { report } = await runClientResearch(user.orgId, clientId);
    revalidatePath(path(clientId));
    return { ok: true, text: report };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Research failed." };
  }
}

/** Turn the monthly automatic research refresh on or off for this client. */
export async function setAutoResearchAction(clientId: string, enabled: boolean): Promise<void> {
  const user = await requireUser();
  await setAutoResearch(user.orgId, clientId, enabled);
  revalidatePath(path(clientId));
}

// ── Profile + knowledge ───────────────────────────────────────────────────────
export async function saveProfileAction(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const clientId = String(formData.get("clientId") ?? "");
  try {
    const pillars = String(formData.get("pillars") ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    await upsertClientProfile(clientId, {
      brandSummary: String(formData.get("brandSummary") ?? "").trim() || null,
      audience: String(formData.get("audience") ?? "").trim() || null,
      tone: String(formData.get("tone") ?? "").trim() || null,
      pillars,
      dosAndDonts: String(formData.get("dosAndDonts") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    });
    revalidatePath(path(clientId));
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save." };
  }
}

export async function approveKnowledgeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (id) await setKnowledgeStatus(id, "approved");
  if (clientId) revalidatePath(path(clientId));
}

export async function dismissKnowledgeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (id) await setKnowledgeStatus(id, "dismissed");
  if (clientId) revalidatePath(path(clientId));
}

export async function addKnowledgeAction(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const clientId = String(formData.get("clientId") ?? "");
  try {
    await proposeKnowledge({
      clientId,
      kind: (String(formData.get("kind") ?? "insight") as
        | "brand"
        | "audience"
        | "competitor"
        | "guideline"
        | "insight"
        | "performance"),
      title: String(formData.get("title") ?? "").trim(),
      content: String(formData.get("content") ?? "").trim(),
      source: "manual",
      status: "approved", // things you type are approved by definition
    });
    revalidatePath(path(clientId));
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add." };
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export async function newThreadAction(clientId: string): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  try {
    const threadId = await createThread(clientId);
    revalidatePath(path(clientId));
    return { ok: true, threadId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start a thread." };
  }
}

type ShootContext = { id: string; title: string; projectId: string | null; brief: string };

/** One turn of the strategist: reply, and write the scripts if this was the go-ahead. */
async function strategistTurn(threadId: string, clientId: string, q: string, shoot: ShootContext | null): Promise<AiResult> {
    const [context, history, elsewhere, defaultStyle] = await Promise.all([
      buildBrainContext(clientId),
      getThreadMessages(threadId),
      otherConversations(clientId, threadId).catch(() => ""),
      clientScriptStyle(clientId).catch(() => "crew" as const),
    ]);
    await addMessage(threadId, "user", q);
    const raw = await runChat({
      system: `${shoot ? `You are planning this shoot with the team. Scripts you write from this conversation go straight onto its run sheet.\n\nTHE SHOOT:\n${shoot.brief}\n\n` : ""}You are the dedicated content strategist for this client inside a creative agency's OS. You know the client's brain and every script already written for them (below), and you help plan, ideate and shape scripts with strong visual and script hooks. British English. Be concrete and practical.

WRITING SCRIPTS: You can add scripts to the studio. Plan first: agree the ideas, angles, number and length with the team in conversation, and when a plan is ready, summarise it as a numbered list and ask for the go-ahead. ONLY when the team clearly tells you to go ahead and write or create the scripts (for example "go ahead", "write them", "yes, make these"), reply with one short confirming sentence and then, on its own final line, exactly: [[WRITE_SCRIPTS:n]] where n is how many scripts were agreed (1 to 10). There are two kinds of script: "crew" (filmed by our team, full camera direction) and "self" (the client films themselves on a phone: a simple shot-by-shot list in everyday words). ${defaultStyle === "self" ? "This client films their own content, so scripts are the \"self\" kind unless the team says our crew is filming." : "This client is filmed by our team, so scripts are the \"crew\" kind unless the team says the client will film it themselves."} To choose the other kind for this batch, add it to the line: [[WRITE_SCRIPTS:n:self]] or [[WRITE_SCRIPTS:n:crew]]. Do not write the full scripts in the chat yourself — the studio writes them from this conversation and saves them as drafts. Never output that line while still planning, when asked a question, or if the number or ideas are not yet agreed; ask instead.

CLIENT BRAIN:\n${context}${elsewhere ? `\n\nOTHER CONVERSATIONS ABOUT THIS CLIENT (their client chat and each shoot's chat — carry on from what was already discussed or agreed there):\n${elsewhere}` : ""}`,
      messages: [...history, { role: "user", content: q }],
      maxTokens: 1500,
    });

    // The go-ahead: turn the agreed plan into draft scripts.
    const go = raw.match(/\[\[WRITE_SCRIPTS:\s*(\d+)\s*(?::\s*(self|crew)\s*)?\]\]/i);
    let reply = raw.replace(/\[\[WRITE_SCRIPTS:[^\]]*\]\]/gi, "").trim();
    if (go) {
      const count = Math.min(Math.max(Number(go[1]) || 1, 1), 10);
      const project = shoot ? (shoot.projectId ? { id: shoot.projectId, name: shoot.title } : null) : await currentProjectFor(clientId);
      const transcript = [...history, { role: "user" as const, content: q }]
        .slice(-30)
        .map((m) => `${m.role === "user" ? "TEAM" : "STRATEGIST"}: ${m.content}`)
        .join("\n\n");
      try {
        const titles = await writeScripts({
          clientId,
          projectId: project?.id ?? null,
          shootId: shoot?.id ?? null,
          instruction: `PLANNING CONVERSATION (the scripts to write were agreed here):\n\n${transcript}`,
          count,
          fromPlan: true,
          style: go[2] ? (go[2].toLowerCase() === "self" ? "self" : "crew") : null,
        });
        reply = titles.length
          ? `${reply}\n\nDone — I've added ${titles.length} draft script${titles.length === 1 ? "" : "s"}${shoot ? ` to this shoot's run sheet` : project ? ` to ${project.name}` : ""}:\n${titles.map((t) => `• ${t}`).join("\n")}\n\n${shoot ? "They are in the list above — open each one to read and approve it." : `Open the Scripts tab${project ? " or the project" : ""} to read and approve them.`}`
          : `${reply}\n\nI couldn't write the scripts just then. Tell me to go ahead again and I'll retry.`;
      } catch (err) {
        reply = `${reply}\n\nI couldn't finish writing the scripts (${err instanceof Error ? err.message : "something went wrong"}). Anything already written is saved as a draft; tell me to go ahead again for the rest.`;
      }
      revalidatePath("/projects", "layout");
      revalidatePath("/shoots", "layout");
    }
    await addMessage(threadId, "assistant", reply);
    revalidatePath(path(clientId));
    return { ok: true, text: reply };
}

export async function chatAction(threadId: string, message: string): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to chat." };
    const clientId = await getThreadClientId(threadId);
    if (!clientId) return { ok: false, error: "Thread not found." };
    const q = message.trim().slice(0, 4000);
    if (!q) return { ok: false, error: "Type a message first." };
    return await strategistTurn(threadId, clientId, q, null);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The assistant hit an error." };
  }
}

/** The same strategist, on a shoot: it knows the day's plan and writes onto its run sheet. */
export async function shootChatAction(shootId: string, message: string): Promise<AiResult> {
  try {
    if (!aiConfigured()) return { ok: false, error: "AI isn't switched on yet." };
    const q = message.trim().slice(0, 4000);
    if (!q) return { ok: false, error: "Type a message first." };
    const sheet = await getShootRunSheet(shootId);
    if (!sheet) return { ok: false, error: "That shoot was not found." };
    const { shoot, talent, scripts } = sheet;
    if (!shoot.clientId) return { ok: false, error: "Link this shoot to a client first, then plan it here." };
    const when = shoot.scheduledAt
      ? new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" }).format(shoot.scheduledAt)
      : "date to be confirmed";
    const brief = [
      `Shoot: ${shoot.title}`,
      `When: ${when}`,
      shoot.locationName ? `Where: ${shoot.locationName}` : null,
      talent.length ? `Talent: ${talent.map((t) => t.name).join(", ")}` : "Talent: not cast yet",
      scripts.length
        ? `Already on the run sheet (${scripts.length}):\n${scripts.map((s) => `- ${s.title} (${s.status === "produced" ? "filmed" : s.status})`).join("\n")}`
        : "Nothing on the run sheet yet.",
    ]
      .filter(Boolean)
      .join("\n");
    const threadId = await ensureShootThread(shootId, shoot.clientId, shoot.title);
    const res = await strategistTurn(threadId, shoot.clientId, q, { id: shoot.id, title: shoot.title, projectId: shoot.projectId, brief });
    revalidatePath(`/shoots/${shootId}`);
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The assistant hit an error." };
  }
}

// ── Script studio ──────────────────────────────────────────────────────────────
export async function generateScriptAction(clientId: string, brief: string): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to generate scripts." };
    const context = await buildBrainContext(clientId);
    const script = await runJson<{
      title: string;
      format?: string;
      hookVisual: string;
      hookScript: string;
      body: string;
    }>({
      system: `You are a short-form video scriptwriter for this client. Using the client brain, write ONE script. It MUST have a strong VISUAL hook (what we see in the first 1-2 seconds) and a SCRIPT hook (the opening spoken line). Return JSON {title, format, hookVisual, hookScript, body}. format is one of reel|tiktok|youtube_short|youtube_long|ad. British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: brief.trim() || "Pitch a strong new idea for this client.",
      maxTokens: 1500,
    });
    const fmt = (["reel", "tiktok", "youtube_short", "youtube_long", "ad", "other"].includes(
      script.format ?? "",
    )
      ? script.format
      : "reel") as "reel" | "tiktok" | "youtube_short" | "youtube_long" | "ad" | "other";
    await createScript({
      clientId,
      title: (script.title || "Untitled script").slice(0, 200),
      format: fmt,
      status: "draft",
      hookVisual: script.hookVisual ?? null,
      hookScript: script.hookScript ?? null,
      body: script.body ?? null,
    });
    revalidatePath(path(clientId));
    return { ok: true, text: `Drafted “${script.title || "Untitled script"}”.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate a script." };
  }
}

// ── Capture an insight from chat into the brain (approve-gated) ───────────────
export async function captureInsightAction(
  clientId: string,
  text: string,
): Promise<AiResult> {
  try {
    const content = text.trim().slice(0, 4000);
    if (!content) return { ok: false, error: "Nothing to save." };
    let title = content.split(/[.\n]/)[0]?.trim().slice(0, 100) || "Insight";
    // Tidy the title with AI when available (optional — capture works without it).
    if (aiConfigured()) {
      title =
        (await runChat({
          system: "Give a 3-7 word title for this note. Return only the title.",
          messages: [{ role: "user", content }],
          maxTokens: 30,
        }).catch(() => title)) || title;
      title = title.replace(/^["']|["']$/g, "").slice(0, 100);
    }
    await proposeKnowledge({
      clientId,
      kind: "insight",
      title,
      content,
      source: "chat",
      status: "proposed",
    });
    revalidatePath(path(clientId));
    return { ok: true, text: "Saved to the brain for your approval." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}

// ── Log a script's real-world result → propose a performance insight ──────────
export async function logResultAction(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const scriptId = String(formData.get("scriptId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const result = String(formData.get("result") ?? "").trim();
  try {
    if (!result) return { error: "Enter how it performed." };
    const s = await getScript(scriptId);
    if (!s) return { error: "Script not found." };
    await appendScriptNotes(scriptId, `Result: ${result}`);

    // Distil a reusable lesson (AI if available, else store the raw result).
    let content = result;
    if (aiConfigured()) {
      content =
        (await runChat({
          system:
            "You turn a content result into one short, reusable lesson for future scripts (what to repeat or avoid). British English, one or two sentences.",
          messages: [
            {
              role: "user",
              content: `Script: ${s.title}. Hook: ${s.hookScript ?? ""}. Result: ${result}`,
            },
          ],
          maxTokens: 200,
        }).catch(() => result)) || result;
    }
    await proposeKnowledge({
      clientId,
      kind: "performance",
      title: `What we learned: ${s.title}`.slice(0, 160),
      content,
      source: "performance",
      status: "proposed",
    });
    revalidatePath(path(clientId));
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not log the result." };
  }
}

// ── Generate an idea backlog (quick ideas as scripts) ─────────────────────────
export async function generateIdeasAction(clientId: string, count = 5): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to generate ideas." };
    const context = await buildBrainContext(clientId);
    const n = Math.max(1, Math.min(10, count));
    const out = await runJson<{ ideas: { title: string; hook: string }[] }>({
      system: `You are the content strategist for this client. Propose ${n} fresh short-form video ideas. Each has a title and a one-line script hook. Return JSON {ideas:[{title, hook}]}. British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: `Give ${n} ideas.`,
      maxTokens: 1200,
    });
    let created = 0;
    for (const idea of (out.ideas ?? []).slice(0, n)) {
      if (!idea.title) continue;
      await createScript({
        clientId,
        title: idea.title.slice(0, 200),
        format: "reel",
        status: "idea",
        hookScript: idea.hook ?? null,
      }).catch(() => {});
      created++;
    }
    revalidatePath(path(clientId));
    return { ok: true, text: `Added ${created} ideas to the backlog.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate ideas." };
  }
}

// ── Refine a script into a new version (v2) ───────────────────────────────────
export async function refineScriptAction(scriptId: string, feedback: string): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to refine scripts." };
    const s = await getScript(scriptId);
    if (!s) return { ok: false, error: "Script not found." };
    const context = await buildBrainContext(s.clientId);
    const improved = await runJson<{
      title: string;
      format?: string;
      hookVisual: string;
      hookScript: string;
      body: string;
    }>({
      system: `You improve an existing short-form video script into a stronger new version, keeping a strong VISUAL hook and SCRIPT hook. Use the client brain and the feedback. Return JSON {title, format, hookVisual, hookScript, body}. British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: `Current script — title: ${s.title}\nScript hook: ${s.hookScript ?? ""}\nBody: ${s.body ?? ""}\n\nFeedback / direction: ${feedback.trim() || "Make it punchier and sharpen the hook."}`,
      maxTokens: 1500,
    });
    const fmt = (["reel", "tiktok", "youtube_short", "youtube_long", "ad", "other"].includes(
      improved.format ?? "",
    )
      ? improved.format
      : "reel") as "reel" | "tiktok" | "youtube_short" | "youtube_long" | "ad" | "other";
    await createScript({
      clientId: s.clientId,
      title: (improved.title || `${s.title} (v2)`).slice(0, 200),
      format: fmt,
      status: "draft",
      hookVisual: improved.hookVisual ?? null,
      hookScript: improved.hookScript ?? null,
      body: improved.body ?? null,
      parentScriptId: scriptId,
    });
    revalidatePath(path(s.clientId));
    return { ok: true, text: "Created a new version." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not refine the script." };
  }
}

// ── Fill a month of ideas onto the content calendar ───────────────────────────
export async function fillMonthAction(clientId: string, count = 8): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to fill the calendar." };
    const user = await requireUser();
    const context = await buildBrainContext(clientId);
    const n = Math.max(1, Math.min(20, count));
    const out = await runJson<{ items: { title: string; channel?: string }[] }>({
      system: `You are the content strategist for this client. Plan ${n} posts for the next month. Each has a title and a channel (instagram|tiktok|youtube|linkedin). Return JSON {items:[{title, channel}]}. British English.\n\nCLIENT BRAIN:\n${context}`,
      prompt: `Plan ${n} posts.`,
      maxTokens: 1200,
    });
    const items = (out.items ?? []).slice(0, n);
    const now = Date.now();
    const stepMs = (28 * 24 * 60 * 60 * 1000) / Math.max(1, items.length);
    let created = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.title) continue;
      const channel = (["instagram", "tiktok", "youtube", "linkedin", "other"].includes(
        it.channel ?? "",
      )
        ? it.channel
        : "instagram") as "instagram" | "tiktok" | "youtube" | "linkedin" | "other";
      const scheduledFor = new Date(now + Math.round((i + 1) * stepMs));
      await getDb()
        .insert(contentItems)
        .values({
          orgId: user.orgId,
          clientId,
          title: it.title.slice(0, 200),
          channel,
          status: "idea",
          scheduledFor,
        })
        .catch(() => {});
      created++;
    }
    revalidatePath(path(clientId));
    revalidatePath("/content");
    return { ok: true, text: `Added ${created} posts across next month.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not fill the calendar." };
  }
}

export async function setScriptStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "idea"
    | "draft"
    | "review"
    | "approved"
    | "produced";
  if (id && status) await setScriptStatus(id, status);
  if (clientId) revalidatePath(path(clientId));
}

export async function pushScriptToContentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (id) await pushScriptToContent(id);
  if (clientId) {
    revalidatePath(path(clientId));
    revalidatePath("/content");
  }
}

export async function archiveScriptAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (id) await archiveScript(id);
  if (clientId) revalidatePath(path(clientId));
}
