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
    max_tokens: maxTokens,
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
