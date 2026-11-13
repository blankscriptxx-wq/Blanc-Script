import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude integration for Blanc Script OS. Reads ANTHROPIC_API_KEY from env.
 * Until it's set, aiConfigured() is false and AI features show a "not connected"
 * state — nothing else breaks. Model is configurable via ANTHROPIC_MODEL
 * (default: claude-opus-5-5).
 */

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

/**
 * The model thinks before it answers, and that thinking is spent from the same
 * allowance as the reply. A small limit can be used up entirely by thinking,
 * leaving an empty answer, so every request gets generous headroom. Callers'
 * `maxTokens` say how long an answer they expect, not a hard cap.
 */
const room = (maxTokens: number) => Math.max(maxTokens, 16000);

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!aiConfigured()) {
    throw new Error(
      "The AI assistant isn't connected yet. Add ANTHROPIC_API_KEY in Settings → Integrations.",
    );
  }
  if (!_client) _client = new Anthropic();
  return _client;
}

export type AssistArgs = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

/** Single-shot text generation. Returns the assistant's text. */
export async function runAssist({ system, prompt, maxTokens = 1500 }: AssistArgs): Promise<string> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: room(maxTokens),
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (msg.stop_reason === "refusal") {
    throw new Error("The assistant declined this request.");
  }
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Multi-turn chat. `messages` is the full history (user/assistant). */
export async function runChat({
  system,
  messages,
  maxTokens = 1500,
}: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}): Promise<string> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: room(maxTokens),
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  if (msg.stop_reason === "refusal") throw new Error("The assistant declined this request.");
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("The assistant came back with nothing. Send that again.");
  return text;
}

/**
 * Generation grounded in live web research (Claude's server-side web search).
 * Loops over pause_turn rounds while the model searches, then returns the text.
 */
export async function runResearch({
  system,
  prompt,
  maxTokens = 2500,
  maxUses = 5,
}: AssistArgs & { maxUses?: number }): Promise<string> {
  const c = client();
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: maxUses }];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let text = "";
  for (let round = 0; round < 5; round++) {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: room(maxTokens),
      system,
      // The installed SDK may not type the latest server tool; pass through.
      tools: tools as unknown as Anthropic.Tool[],
      messages,
    });
    if (res.stop_reason === "refusal") throw new Error("The assistant declined this request.");
    text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    break;
  }
  return text;
}

/**
 * Generation that returns a JSON value. The model is asked to reply with JSON
 * only; the first JSON object/array in the reply is parsed. Throws on failure.
 */
export async function runJson<T = unknown>(args: AssistArgs): Promise<T> {
  const raw = await runAssist({
    ...args,
    system: `${args.system}\n\nReturn ONLY valid JSON. No prose, no code fences.`,
  });
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.search(/[[{]/);
  const slice = start >= 0 ? cleaned.slice(start) : cleaned;
  try {
    return JSON.parse(slice) as T;
  } catch {
    // Try trimming to the last closing bracket/brace.
    const lastObj = slice.lastIndexOf("}");
    const lastArr = slice.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (end > 0) return JSON.parse(slice.slice(0, end + 1)) as T;
    throw new Error("The assistant returned a response that couldn't be parsed.");
  }
}

/**
 * Generation that must come back in a fixed shape. The reply is constrained to
 * `schema` (a JSON Schema object: every object needs `additionalProperties:
 * false` and all its properties listed in `required`), so quotes and line
 * breaks in long text can never break it the way hand-written JSON can.
 */
export async function runStructured<T = unknown>({
  system,
  prompt,
  maxTokens = 16000,
  schema,
}: AssistArgs & { schema: Record<string, unknown> }): Promise<T> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: room(maxTokens),
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema } },
  });
  if (msg.stop_reason === "refusal") throw new Error("The assistant declined this request.");
  if (msg.stop_reason === "max_tokens") throw new Error("That was too much to write in one go. Ask for fewer at a time.");
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The assistant didn't return a usable result. Try again.");
  }
}
