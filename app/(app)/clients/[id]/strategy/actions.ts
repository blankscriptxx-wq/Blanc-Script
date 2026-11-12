"use server";
import { revalidatePath } from "next/cache";
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
  getThreadClientId,
  getThreadMessages,
} from "@/lib/data/client-chat";
import { createScript, pushScriptToContent, setScriptStatus, archiveScript } from "@/lib/data/scripts";

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

function path(clientId: string) {
  return `/clients/${clientId}/strategy`;
}

// ── Research (web) → seed profile + propose knowledge ─────────────────────────
export async function researchClientAction(clientId: string): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to run research." };
    const profile = await getClientProfile(clientId);
    if (!profile) return { ok: false, error: "Client not found." };

    const report = await runResearch({
      system:
        "You are a brand and content strategist for a creative video agency. Research the client's niche and competitors on the web. Produce a concise landscape: who the client is, their audience, 3-5 competitors (what works for each), and 3-5 content opportunities. British English.",
      prompt: `Client: ${profile.clientName}. ${profile.brandSummary ? `What we know: ${profile.brandSummary}` : ""} ${profile.notes ?? ""}`.trim(),
      maxTokens: 2500,
    });

    // Structure the report into a draft profile + proposals.
    const structured = await runJson<{
      brandSummary?: string;
      audience?: string;
      tone?: string;
      pillars?: string[];
      competitors?: { name: string; insight: string }[];
      opportunities?: { title: string; detail: string }[];
    }>({
      system:
        "Extract a strategy brief from this research as JSON with keys: brandSummary, audience, tone, pillars (array), competitors (array of {name, insight}), opportunities (array of {title, detail}).",
      prompt: report,
      maxTokens: 1500,
    }).catch(() => ({}) as Record<string, never>);

    // Seed profile fields only where currently empty (a draft to refine).
    await upsertClientProfile(clientId, {
      brandSummary: profile.brandSummary ?? structured.brandSummary ?? null,
      audience: profile.audience ?? structured.audience ?? null,
      tone: profile.tone ?? structured.tone ?? null,
      pillars: profile.pillars?.length ? profile.pillars : structured.pillars ?? [],
      dosAndDonts: profile.dosAndDonts ?? null,
      notes: profile.notes ?? null,
      markResearched: true,
    });

    for (const c of structured.competitors ?? [])
      await proposeKnowledge({
        clientId,
        kind: "competitor",
        title: c.name?.slice(0, 200) || "Competitor",
        content: c.insight ?? "",
        source: "research",
      }).catch(() => {});
    for (const o of structured.opportunities ?? [])
      await proposeKnowledge({
        clientId,
        kind: "insight",
        title: o.title?.slice(0, 200) || "Opportunity",
        content: o.detail ?? "",
        source: "research",
      }).catch(() => {});

    revalidatePath(path(clientId));
    return { ok: true, text: report };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Research failed." };
  }
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

export async function chatAction(threadId: string, message: string): Promise<AiResult> {
  try {
    if (!aiConfigured())
      return { ok: false, error: "Add an Anthropic API key in Settings → Integrations to chat." };
    const clientId = await getThreadClientId(threadId);
    if (!clientId) return { ok: false, error: "Thread not found." };
    const q = message.trim().slice(0, 4000);
    if (!q) return { ok: false, error: "Type a message first." };

    const [context, history] = await Promise.all([
      buildBrainContext(clientId),
      getThreadMessages(threadId),
    ]);
    await addMessage(threadId, "user", q);
    const reply = await runChat({
      system: `You are the dedicated content strategist for this client inside a creative agency's OS. You know the client's brain (below) and help plan, ideate and write scripts with strong visual and script hooks. British English. Be concrete and practical. You cannot take actions in the app; suggest what to do.\n\nCLIENT BRAIN:\n${context}`,
      messages: [...history, { role: "user", content: q }],
      maxTokens: 1500,
    });
    await addMessage(threadId, "assistant", reply);
    revalidatePath(path(clientId));
    return { ok: true, text: reply };
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
