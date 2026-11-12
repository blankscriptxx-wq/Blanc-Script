import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Aniro WhatsApp gateway — the OS side of the contract described in
 * docs/aniro-whatsapp-brief.md.
 *
 *   ANIRO_API_URL         base URL of Aniro's API, e.g. https://api.aniro.ai
 *   ANIRO_API_KEY         bearer key the OS uses to send
 *   ANIRO_WEBHOOK_SECRET  shared secret Aniro signs its webhooks with
 *
 * Until the first two are set, messages are stored in the inbox but not sent.
 */

export function aniroConfigured(): boolean {
  return Boolean(process.env.ANIRO_API_URL?.trim() && process.env.ANIRO_API_KEY?.trim());
}

/** Digits-only international form, e.g. "07700 900412" → "447700900412". */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `44${digits.slice(1)}`; // UK national format
  digits = digits.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export type SendResult =
  | { ok: true; externalId: string | null; status: string }
  | { ok: false; error: string };

/** Send one text message. `reference` is the OS message id (idempotency key). */
export async function sendWhatsApp(input: {
  to: string;
  text: string;
  reference: string;
}): Promise<SendResult> {
  const base = process.env.ANIRO_API_URL?.trim().replace(/\/$/, "");
  const key = process.env.ANIRO_API_KEY?.trim();
  if (!base || !key) return { ok: false, error: "WhatsApp isn't connected yet." };
  try {
    const res = await fetch(`${base}/v1/whatsapp/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.reference,
      },
      body: JSON.stringify({ to: `+${input.to}`, type: "text", text: input.text, reference: input.reference }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      error?: { message?: string } | string;
    };
    if (!res.ok) {
      const message = typeof json.error === "string" ? json.error : json.error?.message;
      return { ok: false, error: message || `Aniro returned ${res.status}.` };
    }
    return { ok: true, externalId: json.id ?? null, status: json.status ?? "queued" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Aniro." };
  }
}

/**
 * Verify `X-Aniro-Signature: t=<unix seconds>,v1=<hex hmac-sha256(secret, "<t>.<raw body>")>`.
 * Rejects anything older than five minutes.
 */
export function verifyAniroSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.ANIRO_WEBHOOK_SECRET?.trim();
  if (!secret || !header) return false;
  const parts = new Map(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
    }),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"), "hex");
  const given = Buffer.from(v1, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
