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

async function call<T>(method: "GET" | "POST" | "DELETE", path: string, params: Params = {}): Promise<T> {
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
 * the raw request body, using any of the given signing secrets (the env
 * STRIPE_WEBHOOK_SECRET and/or the one stored when the OS connected itself).
 * Rejects events older than five minutes.
 */
export function verifyWebhook(rawBody: string, header: string | null, secrets: string[] = []): boolean {
  const all = [process.env.STRIPE_WEBHOOK_SECRET?.trim(), ...secrets].filter((x): x is string => Boolean(x));
  if (!all.length || !header) return false;
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
  return all.some((secret) => {
    const a = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"), "hex");
    return sigs.some((sig) => {
      const b = Buffer.from(sig, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    });
  });
}

// ── Subscriptions (packages billed monthly) ───────────────────────────────

export type StripeSubscription = {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: {
    data: {
      id: string;
      current_period_end?: number;
      price: { id: string; unit_amount: number | null; metadata?: Record<string, string> | null };
    }[];
  };
};

export type StripeInvoice = {
  id: string;
  number: string | null;
  status: string;
  customer: string;
  currency: string;
  subtotal: number;
  total: number;
  amount_paid: number;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  billing_reason?: string | null;
  status_transitions?: { paid_at?: number | null };
  lines: { data: { description: string | null; amount: number; quantity: number | null }[] };
};

/** When the current paid period ends (field moved onto items in newer API versions). */
export function subscriptionPeriodEnd(sub: StripeSubscription): Date | null {
  const ts = sub.current_period_end ?? sub.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

export async function createCustomer(input: {
  name: string;
  email?: string | null;
  clientId: string;
  orgId: string;
}): Promise<{ id: string }> {
  return call("POST", "/customers", {
    name: input.name,
    email: input.email ?? undefined,
    "metadata[client_id]": input.clientId,
    "metadata[org_id]": input.orgId,
  });
}

export async function createProduct(name: string, planId: string): Promise<{ id: string }> {
  return call("POST", "/products", { name: `Blanc Script — ${name}`, "metadata[plan_id]": planId });
}

export async function createMonthlyPrice(input: {
  productId: string;
  amountPence: number;
  currency: string;
  planId: string;
}): Promise<{ id: string }> {
  return call("POST", "/prices", {
    product: input.productId,
    currency: input.currency.toLowerCase(),
    unit_amount: input.amountPence,
    "recurring[interval]": "month",
    "metadata[plan_id]": input.planId,
  });
}

/** A Stripe Checkout page that starts a monthly subscription for one client. */
export async function createSubscriptionCheckout(input: {
  customerId: string;
  priceId: string;
  clientId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  /** Add-ons: monthly ones join the subscription, one-off ones go on the first invoice. */
  extras?: { name: string; amountPence: number; recurring: boolean }[];
  currency?: string;
}): Promise<{ id: string; url: string }> {
  const extras: Record<string, string | number> = {};
  (input.extras ?? []).forEach((x, n) => {
    const i = n + 1;
    extras[`line_items[${i}][quantity]`] = 1;
    extras[`line_items[${i}][price_data][currency]`] = (input.currency ?? "gbp").toLowerCase();
    extras[`line_items[${i}][price_data][unit_amount]`] = x.amountPence;
    extras[`line_items[${i}][price_data][product_data][name]`] = x.name.slice(0, 200);
    if (x.recurring) extras[`line_items[${i}][price_data][recurring][interval]`] = "month";
  });
  return call("POST", "/checkout/sessions", {
    mode: "subscription",
    customer: input.customerId,
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": 1,
    ...extras,
    "metadata[client_id]": input.clientId,
    "subscription_data[metadata][client_id]": input.clientId,
    "subscription_data[metadata][plan_id]": input.planId,
    // Always charge in the package's own currency (no local-currency conversion offer).
    "adaptive_pricing[enabled]": false,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
}

export async function getSubscription(id: string): Promise<StripeSubscription> {
  return call("GET", `/subscriptions/${encodeURIComponent(id)}`);
}

export async function listCustomerSubscriptions(customerId: string): Promise<StripeSubscription[]> {
  const res = await call<{ data: StripeSubscription[] }>("GET", "/subscriptions", {
    customer: customerId,
    status: "all",
    limit: 10,
  });
  return res.data;
}

/**
 * Move a subscription to a different price straight away. The difference for
 * the rest of the month is invoiced and charged immediately.
 */
export async function changeSubscriptionPrice(input: {
  subscriptionId: string;
  itemId: string;
  priceId: string;
  planId: string;
}): Promise<StripeSubscription> {
  return call("POST", `/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
    "items[0][id]": input.itemId,
    "items[0][price]": input.priceId,
    proration_behavior: "always_invoice",
    payment_behavior: "error_if_incomplete",
    "metadata[plan_id]": input.planId,
  });
}

/** Stripe-hosted page where a customer updates their card or downloads receipts. */
export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
  return call("POST", "/billing_portal/sessions", { customer: customerId, return_url: returnUrl });
}

export async function listCustomerInvoices(customerId: string, limit = 24): Promise<StripeInvoice[]> {
  const res = await call<{ data: StripeInvoice[] }>("GET", "/invoices", { customer: customerId, limit });
  return res.data;
}

export async function getInvoice(id: string): Promise<StripeInvoice> {
  return call("GET", `/invoices/${encodeURIComponent(id)}`);
}

// ── Connecting Stripe to the OS (webhook endpoint) ────────────────────────

export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export async function createWebhookEndpoint(url: string): Promise<{ id: string; secret: string }> {
  const params: Params = { url, description: "Blanc Script OS" };
  WEBHOOK_EVENTS.forEach((e, i) => {
    params[`enabled_events[${i}]`] = e;
  });
  return call("POST", "/webhook_endpoints", params);
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await call("DELETE", `/webhook_endpoints/${encodeURIComponent(id)}`);
}
