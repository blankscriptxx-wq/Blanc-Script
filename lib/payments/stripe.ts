import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe client (REST over fetch — no SDK dependency).
 * Needs STRIPE_SECRET_KEY; STRIPE_WEBHOOK_SECRET enables instant
 * "paid" updates via /api/stripe/webhook. Without the webhook secret,
 * payment is confirmed by checking the link (see confirmPaid).
 */
const API = "https://api.stripe.com/v1";

function key(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

export function stripeConfigured(): boolean {
  return Boolean(key());
}

/** "test" for sk_test_/rk_test_ keys, "live" otherwise. */
export function stripeMode(): "test" | "live" | null {
  const k = key();
  if (!k) return null;
  return /^(sk|rk)_test_/.test(k) ? "test" : "live";
}

export function stripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

type Params = Record<string, string | number | boolean | undefined>;

async function call<T>(method: "GET" | "POST", path: string, params: Params = {}): Promise<T> {
  const k = key();
  if (!k) throw new Error("Stripe isn't connected yet. Add STRIPE_SECRET_KEY to enable online payment.");
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) body.append(name, String(value));
  }
  const url = method === "GET" && [...body.keys()].length ? `${API}${path}?${body}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${k}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) {
    throw new Error(json.error?.message ? `Stripe: ${json.error.message}` : `Stripe request failed (${res.status}).`);
  }
  return json;
}

export type PaymentLink = { id: string; url: string };

/**
 * A reusable-until-paid payment link for one invoice. The link takes a single
 * payment (limit 1) and carries the invoice id so the webhook can match it.
 */
export async function createPaymentLink(input: {
  invoiceId: string;
  title: string;
  amountPence: number;
  currency: string;
  returnUrl: string;
}): Promise<PaymentLink> {
  const price = await call<{ id: string }>("POST", "/prices", {
    currency: input.currency.toLowerCase(),
    unit_amount: input.amountPence,
    "product_data[name]": input.title,
  });
  return call<PaymentLink>("POST", "/payment_links", {
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": 1,
    "metadata[invoice_id]": input.invoiceId,
    "payment_intent_data[metadata][invoice_id]": input.invoiceId,
    "payment_intent_data[description]": input.title,
    "restrictions[completed_sessions][limit]": 1,
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": input.returnUrl,
  });
}

/** Switch an old link off (used when the amount changes or the invoice is voided). */
export async function deactivatePaymentLink(id: string): Promise<void> {
  await call("POST", `/payment_links/${encodeURIComponent(id)}`, { active: false });
}

/** Has anyone completed and paid a checkout from this link? */
export async function paymentLinkPaid(id: string): Promise<boolean> {
  const res = await call<{ data: { payment_status?: string; status?: string }[] }>(
    "GET",
    "/checkout/sessions",
    { payment_link: id, limit: 10 },
  );
  return res.data.some((s) => s.status === "complete" && s.payment_status === "paid");
}

/**
 * Verify a Stripe webhook signature (the `Stripe-Signature` header) against
 * the raw request body. Rejects events older than five minutes.
 */
export function verifyWebhook(rawBody: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !header) return false;
  const parts = new Map<string, string[]>();
  for (const piece of header.split(",")) {
    const [k, v] = piece.split("=", 2);
    if (!k || !v) continue;
    parts.set(k.trim(), [...(parts.get(k.trim()) ?? []), v.trim()]);
  }
  const t = parts.get("t")?.[0];
  const sigs = parts.get("v1") ?? [];
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  return sigs.some((s) => {
    const b = Buffer.from(s, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
