import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clientContacts,
  clientOnboardings,
  clients,
  invoiceLineItems,
  invoices,
  organisations,
  servicePlans,
} from "@/lib/db/schema";
import { appOrigin, sendEmail } from "@/lib/email/send";
import {
  changeSubscriptionPrice,
  createBillingPortalSession,
  createCustomer,
  createMonthlyPrice,
  createProduct,
  createSubscriptionCheckout,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getInvoice,
  getSubscription,
  listCustomerInvoices,
  listCustomerSubscriptions,
  subscriptionPeriodEnd,
  type StripeInvoice,
  type StripeSubscription,
} from "@/lib/payments/stripe";

/**
 * Package subscriptions, billed through Stripe and mirrored in the OS.
 *
 *   package (service_plans)  ⇄  Stripe product + monthly price
 *   client                   ⇄  Stripe customer + subscription
 *   Stripe invoice (paid)    →  OS invoice (paid) + email to the client
 *
 * Nothing here takes a signed-in user: callers (staff actions, the client
 * portal, the Stripe webhook) resolve and pass the workspace themselves.
 * Prices are ex VAT and no VAT is added (Blanc Script is not VAT registered).
 */

const LIVE = new Set(["active", "trialing", "past_due", "unpaid"]);

export function subscriptionIsLive(status: string | null | undefined): boolean {
  return Boolean(status && LIVE.has(status));
}

// ── Lookups ───────────────────────────────────────────────────────────────

async function loadClient(orgId: string, clientId: string) {
  const [c] = await getDb()
    .select({
      id: clients.id,
      orgId: clients.orgId,
      name: clients.name,
      currency: clients.currency,
      servicePlanId: clients.servicePlanId,
      retainerOverridePence: clients.retainerOverridePence,
      stripeCustomerId: clients.stripeCustomerId,
      stripeSubscriptionId: clients.stripeSubscriptionId,
      subscriptionStatus: clients.subscriptionStatus,
      subscriptionPeriodEnd: clients.subscriptionPeriodEnd,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!c) throw new Error("That client was not found.");
  return c;
}

async function loadPlan(orgId: string, planId: string) {
  const [p] = await getDb()
    .select()
    .from(servicePlans)
    .where(and(eq(servicePlans.id, planId), eq(servicePlans.orgId, orgId), isNull(servicePlans.archivedAt)))
    .limit(1);
  if (!p) throw new Error("That package is no longer available.");
  return p;
}

async function primaryContact(orgId: string, clientId: string) {
  const [row] = await getDb()
    .select({ name: clientContacts.name, email: clientContacts.email })
    .from(clientContacts)
    .where(and(eq(clientContacts.orgId, orgId), eq(clientContacts.clientId, clientId)))
    .orderBy(desc(clientContacts.isPrimary), asc(clientContacts.createdAt))
    .limit(1);
  return row ?? null;
}

// ── Stripe objects for our records ────────────────────────────────────────

export async function ensureStripeCustomer(orgId: string, clientId: string): Promise<string> {
  const c = await loadClient(orgId, clientId);
  if (c.stripeCustomerId) return c.stripeCustomerId;
  const contact = await primaryContact(orgId, clientId);
  const customer = await createCustomer({ name: c.name, email: contact?.email, clientId, orgId });
  await getDb()
    .update(clients)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(clients.id, clientId));
  return customer.id;
}

/** The Stripe monthly price for a package at `amountPence` (created on demand). */
async function ensurePlanPrice(orgId: string, planId: string, amountPence: number, currency: string): Promise<string> {
  const plan = await loadPlan(orgId, planId);
  let productId = plan.stripeProductId;
  if (!productId) {
    productId = (await createProduct(plan.name, plan.id)).id;
    await getDb().update(servicePlans).set({ stripeProductId: productId }).where(eq(servicePlans.id, plan.id));
  }
  const isListPrice = amountPence === plan.pricePence;
  if (isListPrice && plan.stripePriceId && plan.stripePriceAmountPence === amountPence) {
    return plan.stripePriceId;
  }
  const price = await createMonthlyPrice({ productId, amountPence, currency, planId: plan.id });
  if (isListPrice) {
    await getDb()
      .update(servicePlans)
      .set({ stripePriceId: price.id, stripePriceAmountPence: amountPence })
      .where(eq(servicePlans.id, plan.id));
  }
  return price.id;
}

// ── Starting a subscription ───────────────────────────────────────────────

/**
 * A Stripe Checkout link that starts the client's monthly subscription for
 * their current package. `returnPath` is where they land afterwards.
 */
export async function startSubscriptionCheckout(
  orgId: string,
  clientId: string,
  returnPath: string,
): Promise<string> {
  const c = await loadClient(orgId, clientId);
  if (!c.servicePlanId) throw new Error("Choose a package for this client first.");
  if (subscriptionIsLive(c.subscriptionStatus)) throw new Error("This client already has a subscription.");
  const plan = await loadPlan(orgId, c.servicePlanId);
  const amount = c.retainerOverridePence ?? plan.pricePence;
  if (!amount || amount < 50) {
    throw new Error("This package has no monthly price, so it can't be billed by subscription.");
  }
  const [customerId, priceId] = await Promise.all([
    ensureStripeCustomer(orgId, clientId),
    ensurePlanPrice(orgId, plan.id, amount, c.currency),
  ]);
  // Add-ons agreed at onboarding ride along: monthly ones recur, one-offs bill once.
  const [ob] = await getDb()
    .select({ extras: clientOnboardings.extras })
    .from(clientOnboardings)
    .where(
      and(
        eq(clientOnboardings.orgId, orgId),
        eq(clientOnboardings.clientId, clientId),
        eq(clientOnboardings.billingType, "subscription"),
        inArray(clientOnboardings.status, ["sent", "completed"]),
      ),
    )
    .orderBy(desc(clientOnboardings.createdAt))
    .limit(1);
  const extras = (ob?.extras ?? [])
    .filter((x) => x.pricePence >= 1)
    .map((x) => ({ name: x.name, amountPence: x.pricePence, recurring: x.cadence === "monthly" }));
  const base = appOrigin();
  const sep = returnPath.includes("?") ? "&" : "?";
  const session = await createSubscriptionCheckout({
    customerId,
    priceId,
    extras,
    currency: c.currency,
    clientId,
    planId: plan.id,
    successUrl: `${base}${returnPath}${sep}subscribed=1`,
    cancelUrl: `${base}${returnPath}`,
  });
  return session.url;
}

// ── Keeping the OS in step with Stripe ────────────────────────────────────

/** The subscription line that is the package itself (add-ons are other lines). */
function planItem(sub: StripeSubscription) {
  return sub.items.data.find((i) => i.price.metadata?.plan_id) ?? sub.items.data[0];
}

/** Apply a Stripe subscription's state to its client (status, renewal date, package). */
async function applySubscription(sub: StripeSubscription): Promise<string | null> {
  const db = getDb();
  const clientIdMeta = sub.metadata?.client_id;
  const [c] = await db
    .select({ id: clients.id, orgId: clients.orgId, servicePlanId: clients.servicePlanId })
    .from(clients)
    .where(
      clientIdMeta && /^[0-9a-f-]{36}$/i.test(clientIdMeta)
        ? eq(clients.id, clientIdMeta)
        : eq(clients.stripeCustomerId, sub.customer),
    )
    .limit(1);
  if (!c) return null;

  // Which package is this price? (list prices are stored on the plan)
  const priceId = planItem(sub)?.price.id;
  let planId: string | null = null;
  if (priceId) {
    const [byPrice] = await db
      .select({ id: servicePlans.id })
      .from(servicePlans)
      .where(and(eq(servicePlans.orgId, c.orgId), eq(servicePlans.stripePriceId, priceId)))
      .limit(1);
    planId = byPrice?.id ?? null;
  }
  const metaPlan = sub.metadata?.plan_id;
  if (!planId && metaPlan && /^[0-9a-f-]{36}$/i.test(metaPlan)) planId = metaPlan;

  const ended = sub.status === "canceled" || sub.status === "incomplete_expired";
  await db
    .update(clients)
    .set({
      stripeCustomerId: sub.customer,
      stripeSubscriptionId: ended ? null : sub.id,
      subscriptionStatus: sub.status,
      subscriptionPeriodEnd: subscriptionPeriodEnd(sub),
      ...(planId && !ended ? { servicePlanId: planId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, c.id));
  return c.id;
}

/** Pull the client's subscription and paid invoices from Stripe (safe to repeat). */
export async function syncClientBilling(orgId: string, clientId: string): Promise<{ invoices: number }> {
  const c = await loadClient(orgId, clientId);
  if (!c.stripeCustomerId) return { invoices: 0 };
  const subs = await listCustomerSubscriptions(c.stripeCustomerId);
  const current =
    subs.find((s) => s.id === c.stripeSubscriptionId) ??
    subs.find((s) => subscriptionIsLive(s.status)) ??
    subs[0];
  if (current) await applySubscription(current);

  let added = 0;
  for (const inv of await listCustomerInvoices(c.stripeCustomerId)) {
    // Whichever of this sync and the webhook records a fresh invoice first emails
    // it, so the client always gets one. Older invoices are backfilled silently.
    const fresh = Date.now() - inv.created * 1000 < 24 * 60 * 60 * 1000;
    if (inv.status === "paid" && (await recordStripeInvoice(inv, { notify: fresh }))) added += 1;
  }
  return { invoices: added };
}

// ── Upgrading ─────────────────────────────────────────────────────────────

export type UpgradeOption = { id: string; name: string; pricePence: number };

/** Packages this client could move up to (monthly, dearer than what they pay now). */
export async function upgradeOptions(orgId: string, clientId: string): Promise<UpgradeOption[]> {
  const c = await loadClient(orgId, clientId);
  if (!c.servicePlanId || !subscriptionIsLive(c.subscriptionStatus)) return [];
  const current = await loadPlan(orgId, c.servicePlanId).catch(() => null);
  const paying = c.retainerOverridePence ?? current?.pricePence ?? 0;
  const rows = await getDb()
    .select({ id: servicePlans.id, name: servicePlans.name, pricePence: servicePlans.pricePence })
    .from(servicePlans)
    .where(
      and(
        eq(servicePlans.orgId, orgId),
        isNull(servicePlans.archivedAt),
        eq(servicePlans.bespoke, false),
        eq(servicePlans.billing, "monthly"),
        gt(servicePlans.pricePence, paying),
      ),
    )
    .orderBy(asc(servicePlans.pricePence));
  return rows.filter((r): r is UpgradeOption => r.pricePence != null);
}

/** Move a client's subscription up to a dearer package, effective immediately. */
export async function upgradeSubscription(
  orgId: string,
  clientId: string,
  planId: string,
  by: string,
): Promise<void> {
  const c = await loadClient(orgId, clientId);
  if (!c.stripeSubscriptionId || !subscriptionIsLive(c.subscriptionStatus)) {
    throw new Error("There's no active subscription to upgrade.");
  }
  const options = await upgradeOptions(orgId, clientId);
  const target = options.find((o) => o.id === planId);
  if (!target) throw new Error("That package isn't available as an upgrade.");

  const sub = await getSubscription(c.stripeSubscriptionId);
  const item = planItem(sub);
  if (!item) throw new Error("The subscription has no package attached in Stripe.");
  const priceId = await ensurePlanPrice(orgId, target.id, target.pricePence, c.currency);
  const updated = await changeSubscriptionPrice({
    subscriptionId: sub.id,
    itemId: item.id,
    priceId,
    planId: target.id,
  });

  // The client now pays the package's list price: drop any custom override.
  await getDb()
    .update(clients)
    .set({ servicePlanId: target.id, retainerOverridePence: null, updatedAt: new Date() })
    .where(eq(clients.id, clientId));
  await applySubscription(updated);
  await getDb().insert(activityLog).values({
    orgId,
    actorUserId: null,
    action: "client.subscription_upgraded",
    entityType: "client",
    entityId: clientId,
    meta: { plan: target.name, by },
  });
  // Their agreement follows the package: send an updated one to accept.
  const { issueAgreement } = await import("@/lib/data/documents");
  await issueAgreement(orgId, clientId, { reason: `Your package is now ${target.name}.` }).catch(() => {});
  // The pro-rata charge arrives as a Stripe invoice; pull it in now too.
  await syncClientBilling(orgId, clientId).catch(() => {});
}

export async function billingPortalUrl(orgId: string, clientId: string, returnPath: string): Promise<string> {
  const c = await loadClient(orgId, clientId);
  if (!c.stripeCustomerId) throw new Error("No payment details on file yet.");
  const session = await createBillingPortalSession(c.stripeCustomerId, `${appOrigin()}${returnPath}`);
  return session.url;
}

// ── Stripe invoice → OS invoice ───────────────────────────────────────────

export async function nextInvoiceNumber(orgId: string): Promise<string> {
  const { rows } = await getDb().execute(sql`
    select coalesce(max((substring(number from '^BS-([0-9]+)$'))::int), 1000) as n
    from invoices where org_id = ${orgId}
  `);
  return `BS-${Number((rows[0] as { n: number }).n) + 1}`;
}

/**
 * Mirror a paid Stripe invoice as a paid OS invoice (once), with its lines,
 * and email it to the client. Returns true when a new invoice was created.
 */
export async function recordStripeInvoice(inv: StripeInvoice, opts: { notify: boolean }): Promise<boolean> {
  const db = getDb();
  if (inv.status !== "paid" || inv.total <= 0) return false;
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.stripeInvoiceId, inv.id))
    .limit(1);
  if (existing) return false;

  const [c] = await db
    .select({ id: clients.id, orgId: clients.orgId, name: clients.name })
    .from(clients)
    .where(eq(clients.stripeCustomerId, inv.customer))
    .limit(1);
  if (!c) return false;

  const paidAt = inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : new Date();
  const number = await nextInvoiceNumber(c.orgId);
  let row: { id: string } | undefined;
  try {
    [row] = await db
      .insert(invoices)
      .values({
        orgId: c.orgId,
        clientId: c.id,
        number,
        status: "paid",
        amountPence: inv.subtotal,
        currency: inv.currency.toUpperCase(),
        reference: inv.number ? `Stripe ${inv.number}` : "Stripe",
        issuedAt: new Date(inv.created * 1000),
        paidAt,
        paymentUrl: inv.hosted_invoice_url,
        documentUrl: inv.invoice_pdf,
        stripeInvoiceId: inv.id,
        paymentMethod: "card",
      })
      .returning({ id: invoices.id });
  } catch {
    return false; // another delivery of the same event won the race
  }
  if (!row) return false;

  const lines = inv.lines?.data ?? [];
  if (lines.length) {
    await db.insert(invoiceLineItems).values(
      lines.map((l, i) => {
        const quantity = Math.max(1, l.quantity ?? 1);
        return {
          orgId: c.orgId,
          invoiceId: row!.id,
          description: (l.description ?? "Subscription").slice(0, 500),
          quantity,
          unitPence: Math.round(l.amount / quantity),
          sortOrder: i,
        };
      }),
    );
  }
  await db.insert(activityLog).values({
    orgId: c.orgId,
    actorUserId: null,
    action: "invoice.paid_online",
    entityType: "invoice",
    entityId: row.id,
    meta: { via: "stripe_subscription", number, amountPence: inv.total },
  });

  if (opts.notify) {
    const contact = await primaryContact(c.orgId, c.id);
    if (contact?.email) {
      const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: inv.currency.toUpperCase() }).format(
        inv.total / 100,
      );
      await sendEmail({
        orgId: c.orgId,
        to: contact.email,
        subject: `Your Blanc Script invoice ${number} — paid`,
        heading: `Invoice ${number}: ${amount} paid`,
        paragraphs: [
          `Hi ${contact.name.split(" ")[0]},`,
          `Thank you — we've received your payment of ${amount} for ${c.name}. Your invoice is attached to your account and you can view or download it any time.`,
          "You'll also find every invoice, and your current package, in your Blanc Script client portal.",
        ],
        button: inv.hosted_invoice_url ? { label: "View invoice", url: inv.hosted_invoice_url } : undefined,
        kind: "invoice",
        related: { type: "invoice", id: row.id },
      });
    }
  }
  return true;
}

// ── Webhook events ────────────────────────────────────────────────────────

type StripeEvent = { type?: string; data?: { object?: Record<string, unknown> } };

/** Handle one verified Stripe event. Returns a short label for the response. */
export async function handleBillingEvent(event: StripeEvent): Promise<string> {
  const obj = event.data?.object ?? {};
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (obj.mode !== "subscription" || typeof obj.subscription !== "string") return "not_subscription";
      const sub = await getSubscription(obj.subscription);
      const clientId = await applySubscription(sub);
      return clientId ? "subscription_linked" : "client_not_found";
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const clientId = await applySubscription(obj as unknown as StripeSubscription);
      return clientId ? "subscription_synced" : "client_not_found";
    }
    case "invoice.paid": {
      // Fetch the full invoice so the lines are complete.
      const inv = await getInvoice(String(obj.id));
      return (await recordStripeInvoice(inv, { notify: true })) ? "invoice_recorded" : "invoice_skipped";
    }
    case "invoice.payment_failed": {
      const customer = typeof obj.customer === "string" ? obj.customer : null;
      if (!customer) return "ignored";
      const [c] = await getDb()
        .select({ id: clients.id, orgId: clients.orgId })
        .from(clients)
        .where(eq(clients.stripeCustomerId, customer))
        .limit(1);
      if (!c) return "client_not_found";
      await getDb().insert(activityLog).values({
        orgId: c.orgId,
        actorUserId: null,
        action: "client.payment_failed",
        entityType: "client",
        entityId: c.id,
        meta: { via: "stripe" },
      });
      const { sendPaymentFailedEmail } = await import("@/lib/data/followups");
      await sendPaymentFailedEmail(c.orgId, c.id).catch(() => {});
      return "payment_failed_logged";
    }
    default:
      return "ignored";
  }
}

// ── Connecting Stripe (webhook endpoint + stored signing secret) ──────────

type OrgSettings = { stripeWebhookId?: string; stripeWebhookSecret?: string };

/** Signing secrets saved when workspaces connected Stripe (used to verify webhooks). */
export async function storedWebhookSecrets(): Promise<string[]> {
  const rows = await getDb().select({ settings: organisations.settings }).from(organisations);
  return rows
    .map((r) => (r.settings as OrgSettings | null)?.stripeWebhookSecret)
    .filter((s): s is string => Boolean(s));
}

export async function stripeConnectionState(orgId: string): Promise<{ connected: boolean }> {
  const [row] = await getDb()
    .select({ settings: organisations.settings })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  const s = (row?.settings ?? {}) as OrgSettings;
  return { connected: Boolean(s.stripeWebhookSecret) || Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()) };
}

/**
 * Register the OS with Stripe so payments and renewals arrive automatically:
 * creates a webhook endpoint in the Stripe account and stores its signing
 * secret with the workspace. Replaces any endpoint this workspace made before.
 */
export async function connectStripeWebhook(orgId: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ settings: organisations.settings })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  const settings = { ...((row?.settings ?? {}) as Record<string, unknown>) } as Record<string, unknown> & OrgSettings;
  if (settings.stripeWebhookId) await deleteWebhookEndpoint(settings.stripeWebhookId).catch(() => {});
  const endpoint = await createWebhookEndpoint(`${appOrigin()}/api/stripe/webhook`);
  settings.stripeWebhookId = endpoint.id;
  settings.stripeWebhookSecret = endpoint.secret;
  await db.update(organisations).set({ settings }).where(eq(organisations.id, orgId));
}

// ── What the screens show ─────────────────────────────────────────────────

export type BillingSummary = {
  planName: string | null;
  monthlyPence: number | null;
  status: string | null;
  live: boolean;
  renewsAt: Date | null;
  hasCustomer: boolean;
  canStart: boolean;
  upgrades: UpgradeOption[];
};

export async function getBillingSummary(orgId: string, clientId: string): Promise<BillingSummary> {
  const c = await loadClient(orgId, clientId);
  const plan = c.servicePlanId ? await loadPlan(orgId, c.servicePlanId).catch(() => null) : null;
  const monthly = c.retainerOverridePence ?? plan?.pricePence ?? null;
  const live = subscriptionIsLive(c.subscriptionStatus);
  return {
    planName: plan?.name ?? null,
    monthlyPence: monthly,
    status: c.subscriptionStatus,
    live,
    renewsAt: live ? c.subscriptionPeriodEnd : null,
    hasCustomer: Boolean(c.stripeCustomerId),
    canStart: !live && Boolean(plan) && !plan?.bespoke && Boolean(monthly && monthly >= 50),
    upgrades: live ? await upgradeOptions(orgId, clientId) : [],
  };
}
