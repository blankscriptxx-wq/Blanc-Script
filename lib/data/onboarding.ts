import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clientContacts,
  clientDocuments,
  clientOnboardings,
  clients,
  invoiceLineItems,
  invoices,
  portalLinks,
  servicePlans,
  type OnboardingExtra,
  type OnboardingTerms,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { nextInvoiceNumber, subscriptionIsLive } from "@/lib/data/billing";
import { createClientDocument, createGeneratedAgreement } from "@/lib/data/documents";
import { syncInvoicePayment } from "@/lib/data/payments";
import { appOrigin, sendEmail, type EmailResult } from "@/lib/email/send";
import { createPaymentLink, deactivatePaymentLink, stripeConfigured } from "@/lib/payments/stripe";

/**
 * Client onboarding. Staff record what was agreed (a monthly package or a
 * one-off project, add-ons, deliverables, which documents to sign) and send a
 * welcome email. The client then sets up their login, accepts the documents
 * and pays — all in their portal. The OS tracks each step and chases it.
 *
 * Staff functions take the signed-in user; the progress/portal functions take
 * an explicit workspace + client because the portal and cron have no session.
 */

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

const extraInput = z.object({
  name: z.string().trim().min(1, "Give every line a name.").max(160),
  pricePence: z.number().int().min(0).max(100_000_00),
  cadence: z.enum(["monthly", "one_off"]),
});

export const onboardingInput = z.object({
  billingType: z.enum(["subscription", "one_off"]),
  servicePlanId: z.string().uuid().nullable(),
  monthlyPence: z.number().int().min(0).max(100_000_00).nullable(),
  projectTitle: z.string().trim().max(160).nullable(),
  extras: z.array(extraInput).max(30),
  deliverables: z.string().trim().max(6000).nullable(),
  templateIds: z.array(z.string().uuid()).max(20),
  contactName: z.string().trim().min(1, "Add the contact's name.").max(120),
  contactEmail: z.string().trim().toLowerCase().email("Enter the contact's email address."),
  welcomeNote: z.string().trim().max(2000).nullable(),
  paymentMethod: z.enum(["card", "cash"]).default("card"),
  terms: z
    .object({
      companyNumber: z.string().trim().max(40).optional(),
      registeredAddress: z.string().trim().max(400).optional(),
      billingAddress: z.string().trim().max(400).optional(),
      minimumTermMonths: z.number().int().min(1).max(60).nullable().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      platforms: z.array(z.string().max(40)).max(12).optional(),
      services: z.array(z.string().max(40)).max(30).optional(),
      exclusions: z.string().trim().max(600).optional(),
      agreement: z.boolean().optional(),
      depositPercent: z.number().int().min(10).max(100).optional(),
      balanceTrigger: z.enum(["on_approval", "manual"]).optional(),
      balanceInvoiceId: z.string().uuid().optional(),
    })
    .default({}),
});
export type OnboardingInput = z.input<typeof onboardingInput>;

export type OnboardingProgress = {
  /** Null when the client was given a plain link rather than a login. */
  accountReady: boolean;
  docsTotal: number;
  docsAccepted: number;
  paid: boolean;
  complete: boolean;
};

export type OnboardingView = {
  id: string;
  status: "draft" | "sent" | "completed" | "cancelled";
  billingType: "subscription" | "one_off";
  paymentMethod: "card" | "cash";
  terms: OnboardingTerms;
  servicePlanId: string | null;
  planName: string | null;
  monthlyPence: number | null;
  projectTitle: string | null;
  extras: OnboardingExtra[];
  deliverables: string | null;
  templateIds: string[];
  contactName: string | null;
  contactEmail: string | null;
  welcomeNote: string | null;
  sentAt: Date | null;
  completedAt: Date | null;
  invoiceId: string | null;
  inviteUrl: string | null;
  progress: OnboardingProgress | null;
};

function requireMoney(user: { capabilities: Set<string> }) {
  if (!user.capabilities.has("can_see_money")) {
    throw new Error("You do not have permission to set up client billing.");
  }
}

async function latest(orgId: string, clientId: string) {
  const [row] = await getDb()
    .select()
    .from(clientOnboardings)
    .where(
      and(
        eq(clientOnboardings.orgId, orgId),
        eq(clientOnboardings.clientId, clientId),
        inArray(clientOnboardings.status, ["draft", "sent", "completed"]),
      ),
    )
    .orderBy(desc(clientOnboardings.createdAt))
    .limit(1);
  return row ?? null;
}

type Row = NonNullable<Awaited<ReturnType<typeof latest>>>;

// ── Progress (no session) ─────────────────────────────────────────────────

async function computeProgress(ob: Row): Promise<OnboardingProgress> {
  const db = getDb();
  const [[link], docs, [client], [inv]] = await Promise.all([
    ob.portalLinkId
      ? db
          .select({ userId: portalLinks.userId, requiresLogin: portalLinks.requiresLogin })
          .from(portalLinks)
          .where(eq(portalLinks.id, ob.portalLinkId))
          .limit(1)
      : Promise.resolve([] as { userId: string | null; requiresLogin: boolean }[]),
    db
      .select({ status: clientDocuments.status })
      .from(clientDocuments)
      .where(
        and(
          eq(clientDocuments.orgId, ob.orgId),
          eq(clientDocuments.clientId, ob.clientId),
          inArray(clientDocuments.status, ["sent", "accepted"]),
        ),
      ),
    db
      .select({ subscriptionStatus: clients.subscriptionStatus })
      .from(clients)
      .where(eq(clients.id, ob.clientId))
      .limit(1),
    ob.invoiceId
      ? db.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, ob.invoiceId)).limit(1)
      : Promise.resolve([] as { status: string }[]),
  ]);
  const accountReady = link ? !link.requiresLogin || Boolean(link.userId) : false;
  const docsTotal = docs.length;
  const docsAccepted = docs.filter((d) => d.status === "accepted").length;
  // Card subscriptions are "paid" once Stripe has them live; everything else by its invoice.
  const paid =
    ob.billingType === "subscription" && ob.paymentMethod !== "cash"
      ? subscriptionIsLive(client?.subscriptionStatus)
      : inv?.status === "paid";
  return { accountReady, docsTotal, docsAccepted, paid, complete: accountReady && docsAccepted === docsTotal && paid };
}

/**
 * Where a client's onboarding has got to. When everything is done this also
 * closes it: the client becomes active and gets a short "you're all set" email.
 */
export async function onboardingProgress(
  orgId: string,
  clientId: string,
  opts: { checkStripe?: boolean } = {},
): Promise<{ ob: Row; progress: OnboardingProgress } | null> {
  const ob = await latest(orgId, clientId);
  if (!ob || ob.status === "draft") return ob ? { ob, progress: await computeProgress(ob) } : null;
  let progress = await computeProgress(ob);
  // A one-off invoice paid by link: ask Stripe in case the webhook hasn't landed.
  if (opts.checkStripe && ob.status === "sent" && ob.billingType === "one_off" && ob.invoiceId && !progress.paid) {
    const res = await syncInvoicePayment(ob.invoiceId, orgId).catch(() => "unpaid" as const);
    if (res === "paid") progress = await computeProgress(ob);
  }
  if (ob.status === "sent" && progress.complete) {
    const db = getDb();
    const [done] = await db
      .update(clientOnboardings)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(clientOnboardings.id, ob.id), eq(clientOnboardings.status, "sent")))
      .returning({ id: clientOnboardings.id });
    if (done) {
      ob.status = "completed";
      ob.completedAt = new Date();
      await db
        .update(clients)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(eq(clients.id, clientId), eq(clients.status, "lead")));
      await db.insert(activityLog).values({
        orgId,
        actorUserId: null,
        action: "client.onboarding_completed",
        entityType: "client",
        entityId: clientId,
        meta: {},
      });
      if (ob.contactEmail) {
        const token = await linkToken(ob.portalLinkId);
        await sendEmail({
          orgId,
          to: ob.contactEmail,
          subject: "You're all set — welcome to Blanc Script",
          heading: "You're all set",
          paragraphs: [
            `Hi ${firstName(ob.contactName)},`,
            "Thank you — your account is set up, your documents are signed and your payment has gone through. We'll be in touch shortly to get things moving.",
            "Your portal is where you'll review and approve work, see your invoices and send us footage.",
          ],
          button: token ? { label: "Open my portal", url: `${appOrigin()}/portal/${token}` } : undefined,
          kind: "onboarding_complete",
          related: { type: "onboarding", id: ob.id },
        });
      }
    }
  }
  return { ob, progress };
}

const firstName = (name: string | null) => (name ?? "there").trim().split(" ")[0] || "there";

async function linkToken(linkId: string | null): Promise<string | null> {
  if (!linkId) return null;
  const [row] = await getDb()
    .select({ token: portalLinks.token })
    .from(portalLinks)
    .where(and(eq(portalLinks.id, linkId), isNull(portalLinks.revokedAt)))
    .limit(1);
  return row?.token ?? null;
}

// ── Staff ─────────────────────────────────────────────────────────────────

async function toView(ob: Row, progress: OnboardingProgress | null): Promise<OnboardingView> {
  const [plan] = ob.servicePlanId
    ? await getDb().select({ name: servicePlans.name }).from(servicePlans).where(eq(servicePlans.id, ob.servicePlanId)).limit(1)
    : [];
  const token = await linkToken(ob.portalLinkId);
  return {
    id: ob.id,
    status: ob.status as OnboardingView["status"],
    billingType: ob.billingType as OnboardingView["billingType"],
    paymentMethod: ob.paymentMethod === "cash" ? "cash" : "card",
    terms: ob.terms ?? {},
    servicePlanId: ob.servicePlanId,
    planName: plan?.name ?? null,
    monthlyPence: ob.monthlyPence,
    projectTitle: ob.projectTitle,
    extras: ob.extras ?? [],
    deliverables: ob.deliverables,
    templateIds: ob.templateIds ?? [],
    contactName: ob.contactName,
    contactEmail: ob.contactEmail,
    welcomeNote: ob.welcomeNote,
    sentAt: ob.sentAt,
    completedAt: ob.completedAt,
    invoiceId: ob.invoiceId,
    inviteUrl: token ? `${appOrigin()}/portal/${token}` : null,
    progress,
  };
}

export async function getOnboarding(clientId: string): Promise<OnboardingView | null> {
  const user = await requireUser();
  const res = await onboardingProgress(user.orgId, clientId, { checkStripe: true });
  if (res) return toView(res.ob, res.ob.status === "draft" ? null : res.progress);
  return null;
}

/** Save the draft of what's been agreed (creates it the first time). */
export async function saveOnboarding(clientId: string, raw: OnboardingInput): Promise<void> {
  const user = await requireUser();
  requireMoney(user);
  const data = onboardingInput.parse(raw);
  const db = getDb();
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, user.orgId)))
    .limit(1);
  if (!client) throw new Error("That client was not found.");

  if (data.billingType === "subscription") {
    if (!data.servicePlanId) throw new Error("Choose the package the client is taking.");
    const [plan] = await db
      .select({ pricePence: servicePlans.pricePence })
      .from(servicePlans)
      .where(and(eq(servicePlans.id, data.servicePlanId), eq(servicePlans.orgId, user.orgId)))
      .limit(1);
    if (!plan) throw new Error("That package is no longer available.");
    data.monthlyPence = data.monthlyPence ?? plan.pricePence;
    if (!data.monthlyPence || data.monthlyPence < 50) throw new Error("Enter the monthly price for this package.");
  } else {
    data.servicePlanId = null;
    data.monthlyPence = null;
    data.extras = data.extras.map((x) => ({ ...x, cadence: "one_off" as const }));
    if (!data.projectTitle) throw new Error("Give the project a name.");
    if (data.extras.reduce((n, x) => n + x.pricePence, 0) < 50) {
      throw new Error("Add at least one line with a price for the project.");
    }
  }

  const existing = await latest(user.orgId, clientId);
  if (existing?.status === "sent") {
    throw new Error("This onboarding has already been sent. Cancel it to start a new one.");
  }
  const values = { ...data, updatedAt: new Date() };
  if (existing?.status === "draft") {
    await db.update(clientOnboardings).set(values).where(eq(clientOnboardings.id, existing.id));
  } else {
    await db
      .insert(clientOnboardings)
      .values({ ...values, orgId: user.orgId, clientId, createdByUserId: user.id });
  }
}

function agreedLines(ob: Row, planName: string | null): string[] {
  const extras = ob.extras ?? [];
  if (ob.billingType === "one_off") {
    const total = extras.reduce((n, x) => n + x.pricePence, 0);
    return [`${ob.projectTitle ?? "Your project"} — ${gbp(total)} in total`, ...extras.map((x) => `  • ${x.name}: ${gbp(x.pricePence)}`)];
  }
  return [
    `${planName ?? "Your package"} — ${gbp(ob.monthlyPence ?? 0)} a month`,
    ...extras.map((x) => `  • ${x.name}: ${gbp(x.pricePence)}${x.cadence === "monthly" ? " a month" : " (one-off)"}`),
  ];
}

function stepsLeft(ob: Row, p: OnboardingProgress): string[] {
  const out: string[] = [];
  if (!p.accountReady) out.push("Set up your login (choose a password)");
  if (p.docsAccepted < p.docsTotal) {
    const n = p.docsTotal - p.docsAccepted;
    out.push(`Read and accept ${n === 1 ? "your agreement" : `your ${n} documents`}`);
  }
  if (!p.paid) {
    out.push(
      ob.paymentMethod === "cash"
        ? "Pay your first invoice by cash or bank transfer — we'll confirm it once received"
        : ob.billingType === "subscription"
          ? "Set up your monthly payment by card"
          : "Pay your invoice by card",
    );
  }
  return out;
}

async function welcomeEmail(ob: Row, planName: string | null, token: string, progress: OnboardingProgress): Promise<EmailResult> {
  const steps = stepsLeft(ob, progress);
  return sendEmail({
    orgId: ob.orgId,
    to: ob.contactEmail!,
    subject: "Welcome to Blanc Script — let's get you set up",
    heading: "Welcome to Blanc Script",
    paragraphs: [
      `Hi ${firstName(ob.contactName)},`,
      ...(ob.welcomeNote ? [ob.welcomeNote] : ["We're really pleased to be working with you. Everything we've agreed is ready for you in your private client portal."]),
      ["What we've agreed:", ...agreedLines(ob, planName)].join("\n"),
      ...(ob.deliverables ? [["What you'll get:", ...ob.deliverables.split("\n").filter((l) => l.trim()).map((l) => `  • ${l.trim()}`)].join("\n")] : []),
      ["To get started (about five minutes):", ...steps.map((s, i) => `  ${i + 1}. ${s}`)].join("\n"),
      "Once that's done you'll receive your invoice by email, and it will always be available in your portal.",
    ],
    button: { label: "Get started", url: `${appOrigin()}/portal/${token}` },
    kind: "welcome",
    related: { type: "onboarding", id: ob.id },
  });
}

/**
 * Send (or re-send) the welcome. The first time, this applies the agreement:
 * sets the client's package, issues the chosen documents, raises the invoice
 * for a one-off project and gives the contact their portal login.
 */
export async function sendOnboarding(clientId: string): Promise<{ emailStatus: EmailResult["status"]; inviteUrl: string }> {
  const user = await requireUser();
  requireMoney(user);
  const db = getDb();
  const ob = await latest(user.orgId, clientId);
  if (!ob) throw new Error("Save what's been agreed first.");
  if (ob.status === "completed") throw new Error("This client has already finished onboarding.");
  if (!ob.contactEmail || !ob.contactName) throw new Error("Add the contact's name and email first.");

  const [plan] = ob.servicePlanId
    ? await db.select().from(servicePlans).where(eq(servicePlans.id, ob.servicePlanId)).limit(1)
    : [];

  let linkId = ob.portalLinkId;
  let invoiceId = ob.invoiceId;

  if (ob.status === "draft") {
    // 1. The client record reflects the agreement.
    if (ob.billingType === "subscription" && plan) {
      await db
        .update(clients)
        .set({
          servicePlanId: plan.id,
          retainerOverridePence: ob.monthlyPence !== plan.pricePence ? ob.monthlyPence : null,
          updatedAt: new Date(),
        })
        .where(and(eq(clients.id, clientId), eq(clients.orgId, user.orgId)));
    }

    // 2. The contact exists (documents and invoice emails use the primary contact).
    const contacts = await db
      .select({ id: clientContacts.id, email: clientContacts.email })
      .from(clientContacts)
      .where(and(eq(clientContacts.orgId, user.orgId), eq(clientContacts.clientId, clientId)));
    if (!contacts.some((c) => c.email?.toLowerCase() === ob.contactEmail)) {
      await db.insert(clientContacts).values({
        orgId: user.orgId,
        clientId,
        name: ob.contactName,
        email: ob.contactEmail,
        isPrimary: contacts.length === 0,
      });
    }

    // 3. Portal login for the contact (reuse theirs if they already have one).
    const [existingLink] = await db
      .select({ id: portalLinks.id })
      .from(portalLinks)
      .where(
        and(
          eq(portalLinks.orgId, user.orgId),
          eq(portalLinks.clientId, clientId),
          eq(portalLinks.email, ob.contactEmail),
          isNull(portalLinks.revokedAt),
        ),
      )
      .limit(1);
    if (existingLink) linkId = existingLink.id;
    else {
      const [elsewhere] = await db
        .select({ id: portalLinks.id })
        .from(portalLinks)
        .where(and(eq(portalLinks.orgId, user.orgId), eq(portalLinks.email, ob.contactEmail), isNull(portalLinks.revokedAt)))
        .limit(1);
      if (elsewhere) throw new Error("That email already has portal access for another client. Use a different email.");
      const [created] = await db
        .insert(portalLinks)
        .values({
          orgId: user.orgId,
          clientId,
          label: ob.contactName,
          token: randomBytes(24).toString("base64url"),
          email: ob.contactEmail,
          requiresLogin: true,
          createdByUserId: user.id,
        })
        .returning({ id: portalLinks.id });
      linkId = created.id;
    }
    const token = (await linkToken(linkId))!;

    // 4. Documents: the tailored Service Agreement, plus a populated copy of
    //    each chosen template — all published to the portal.
    const issue: { id: string }[] = [];
    // The agreement is always written and sent with the welcome (which is the email they get).
    issue.push(await createGeneratedAgreement(clientId, { notify: false }));
    for (const templateId of ob.templateIds ?? []) issue.push(await createClientDocument(clientId, templateId));
    for (const doc of issue) {
      await db
        .update(clientDocuments)
        .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(eq(clientDocuments.id, doc.id));
    }

    // 5. A one-off project, or anything paid in cash: raise the invoice now.
    //    (Card subscriptions are invoiced by Stripe when each payment is taken.)
    const cash = ob.paymentMethod === "cash";
    if (ob.billingType === "one_off" || cash) {
      const lines = [
        ...(ob.billingType === "subscription" && plan
          ? [{ name: `${plan.name} — monthly package`, pricePence: ob.monthlyPence ?? 0 }]
          : []),
        ...(ob.extras ?? []),
      ].filter((x) => x.pricePence > 0);
      const total = lines.reduce((n, x) => n + x.pricePence, 0);
      // A project can take a deposit now and the balance later.
      const pct = ob.billingType === "one_off" ? (ob.terms?.depositPercent ?? 100) : 100;
      const deposit = pct < 100;
      invoiceId = await raiseInvoice({
        orgId: user.orgId,
        clientId,
        lines: deposit
          ? [{ name: `Deposit (${pct}%) — ${ob.projectTitle ?? "project"}`, pricePence: Math.round((total * pct) / 100) }]
          : lines,
        reference: ob.billingType === "one_off" ? `${ob.projectTitle ?? "Project"}${deposit ? " — deposit" : ""}` : "First month",
        card: !cash,
        returnUrl: `${appOrigin()}/portal/${token}?paid=1`,
        payerEmail: ob.contactEmail,
      });
    }

    await db
      .update(clientOnboardings)
      .set({ status: "sent", sentAt: new Date(), portalLinkId: linkId, invoiceId, updatedAt: new Date() })
      .where(eq(clientOnboardings.id, ob.id));
    await db.insert(activityLog).values({
      orgId: user.orgId,
      actorUserId: user.id,
      action: "client.onboarding_sent",
      entityType: "client",
      entityId: clientId,
      meta: { to: ob.contactEmail },
    });
    ob.status = "sent";
    ob.portalLinkId = linkId;
    ob.invoiceId = invoiceId;
  }

  const token = await linkToken(ob.portalLinkId);
  if (!token) throw new Error("The client's portal access was removed. Cancel this onboarding and start again.");
  const progress = await computeProgress(ob);
  const res = await welcomeEmail(ob, plan?.name ?? null, token, progress);
  return { emailStatus: res.status, inviteUrl: `${appOrigin()}/portal/${token}` };
}

/** Stop an onboarding. An unpaid one-off invoice it raised is withdrawn. */
export async function cancelOnboarding(clientId: string): Promise<void> {
  const user = await requireUser();
  requireMoney(user);
  const ob = await latest(user.orgId, clientId);
  if (!ob) return;
  if (ob.status === "completed") throw new Error("This onboarding is already complete.");
  const db = getDb();
  if (ob.invoiceId) {
    const [inv] = await db
      .update(invoices)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoices.id, ob.invoiceId), sql`${invoices.status} <> 'paid'`))
      .returning({ linkId: invoices.stripePaymentLinkId });
    if (inv?.linkId) await deactivatePaymentLink(inv.linkId).catch(() => {});
  }
  await db
    .update(clientOnboardings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(clientOnboardings.id, ob.id));
}

/**
 * Email the client what's still left to do. Used by the "Send reminder" button
 * and by the daily follow-up job. Returns null when there is nothing to chase.
 */
export async function sendOnboardingReminder(orgId: string, clientId: string): Promise<EmailResult | null> {
  const res = await onboardingProgress(orgId, clientId, { checkStripe: true });
  if (!res || res.ob.status !== "sent" || !res.ob.contactEmail) return null;
  const { ob, progress } = res;
  const token = await linkToken(ob.portalLinkId);
  if (!token) return null;
  const steps = stepsLeft(ob, progress);
  if (!steps.length) return null;
  return sendEmail({
    orgId,
    to: ob.contactEmail!,
    subject: progress.accountReady
      ? "A quick reminder — a couple of things left to finish"
      : "A quick reminder — your Blanc Script account is waiting",
    heading: progress.accountReady ? "Nearly there" : "Your account is ready to set up",
    paragraphs: [
      `Hi ${firstName(ob.contactName)},`,
      progress.accountReady
        ? "Thanks for setting up your account. There's just a little left to do before we can get started:"
        : "We sent you a welcome a few days ago and wanted to make sure it didn't get lost. It only takes about five minutes:",
      steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n"),
      "If anything doesn't look right, just get in touch with us and we'll sort it.",
    ],
    button: { label: progress.accountReady ? "Finish setting up" : "Set up my account", url: `${appOrigin()}/portal/${token}` },
    kind: "onboarding_reminder",
    related: { type: "onboarding", id: ob.id },
  });
}

export async function remindOnboarding(clientId: string): Promise<EmailResult | null> {
  const user = await requireUser();
  requireMoney(user);
  return sendOnboardingReminder(user.orgId, clientId);
}

/** Raise a client invoice (status "sent"), with a card payment link when wanted. */
async function raiseInvoice(input: {
  orgId: string;
  clientId: string;
  lines: { name: string; pricePence: number }[];
  reference: string;
  card: boolean;
  returnUrl: string;
  payerEmail: string | null;
}): Promise<string> {
  const db = getDb();
  const total = input.lines.reduce((n, x) => n + x.pricePence, 0);
  const number = await nextInvoiceNumber(input.orgId);
  const [inv] = await db
    .insert(invoices)
    .values({
      orgId: input.orgId,
      clientId: input.clientId,
      number,
      status: "sent",
      amountPence: total,
      reference: input.reference,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning({ id: invoices.id });
  await db.insert(invoiceLineItems).values(
    input.lines.map((x, i) => ({
      orgId: input.orgId,
      invoiceId: inv.id,
      description: x.name,
      quantity: 1,
      unitPence: x.pricePence,
      sortOrder: i,
    })),
  );
  if (input.card && stripeConfigured()) {
    const link = await createPaymentLink({
      invoiceId: inv.id,
      title: `Blanc Script invoice ${number} — ${input.reference}`,
      amountPence: total,
      currency: "GBP",
      returnUrl: input.returnUrl,
    });
    await db
      .update(invoices)
      .set({
        // Pre-fill the payer's email so they only need their card.
        paymentUrl: input.payerEmail ? `${link.url}?prefilled_email=${encodeURIComponent(input.payerEmail)}` : link.url,
        stripePaymentLinkId: link.id,
        stripeLinkAmountPence: total,
      })
      .where(eq(invoices.id, inv.id));
  }
  return inv.id;
}

/** What is still owed on a project after its deposit (null when nothing is, or it's already invoiced). */
function balanceOwed(ob: Row): { pct: number; total: number; balance: number } | null {
  if (ob.billingType !== "one_off" || (ob.status !== "sent" && ob.status !== "completed")) return null;
  const pct = ob.terms?.depositPercent ?? 100;
  if (pct >= 100 || ob.terms?.balanceInvoiceId) return null;
  const total = (ob.extras ?? []).reduce((n, x) => n + x.pricePence, 0);
  const balance = total - Math.round((total * pct) / 100);
  return balance > 0 ? { pct, total, balance } : null;
}

/**
 * Raise and email the balance invoice for a project that took a deposit.
 * Runs when staff press the button, or by itself when the client approves the
 * work (if that was chosen at onboarding). Does nothing if it isn't due.
 */
export async function sendBalanceInvoice(orgId: string, clientId: string, actorUserId: string | null): Promise<boolean> {
  const ob = await latest(orgId, clientId);
  const owed = ob ? balanceOwed(ob) : null;
  if (!ob || !owed) return false;
  const db = getDb();
  const token = await linkToken(ob.portalLinkId);
  const lines = [
    ...(ob.extras ?? []).filter((x) => x.pricePence > 0).map((x) => ({ name: x.name, pricePence: x.pricePence })),
    { name: `Less deposit paid (${owed.pct}%)`, pricePence: -(owed.total - owed.balance) },
  ];
  const invoiceId = await raiseInvoice({
    orgId,
    clientId,
    lines,
    reference: `${ob.projectTitle ?? "Project"} — balance`,
    card: ob.paymentMethod !== "cash",
    returnUrl: token ? `${appOrigin()}/portal/${token}?paid=1` : `${appOrigin()}/pay/thanks`,
    payerEmail: ob.contactEmail,
  });
  // Record it against the onboarding; if another request got there first, withdraw ours.
  const claimed = await db
    .update(clientOnboardings)
    .set({ terms: { ...(ob.terms ?? {}), balanceInvoiceId: invoiceId }, updatedAt: new Date() })
    .where(and(eq(clientOnboardings.id, ob.id), sql`${clientOnboardings.terms} ->> 'balanceInvoiceId' is null`))
    .returning({ id: clientOnboardings.id });
  if (!claimed.length) {
    await db.update(invoices).set({ archivedAt: new Date() }).where(eq(invoices.id, invoiceId));
    return false;
  }
  await db.insert(activityLog).values({
    orgId,
    actorUserId,
    action: "invoice.balance_sent",
    entityType: "client",
    entityId: clientId,
    meta: { amountPence: owed.balance, automatic: actorUserId === null },
  });
  if (ob.contactEmail) {
    await sendEmail({
      orgId,
      to: ob.contactEmail,
      subject: `Your final invoice — ${ob.projectTitle ?? "your project"}`,
      heading: `Final invoice: ${gbp(owed.balance)}`,
      paragraphs: [
        `Hi ${firstName(ob.contactName)},`,
        `Thank you — ${ob.projectTitle ?? "your project"} is nearly wrapped. The remaining balance of ${gbp(owed.balance)} is now due (your ${owed.pct}% deposit has been taken off).`,
        ob.paymentMethod === "cash"
          ? "You're paying us directly, so we'll mark it as paid as soon as we receive it. Your final files are released once it's settled."
          : "You can pay securely by card in your portal. Your final files are released once it's settled.",
      ],
      button: token ? { label: "View and pay invoice", url: `${appOrigin()}/portal/${token}/invoices/${invoiceId}` } : undefined,
      kind: "invoice",
      related: { type: "invoice", id: invoiceId },
    });
  }
  return true;
}

/** Staff button: send the balance invoice now. */
export async function sendBalanceInvoiceNow(clientId: string): Promise<boolean> {
  const user = await requireUser();
  requireMoney(user);
  return sendBalanceInvoice(user.orgId, clientId, user.id);
}

/** The client approved a piece of work: if nothing is left to approve, send the balance invoice. */
export async function balanceOnApproval(orgId: string, clientId: string): Promise<void> {
  const ob = await latest(orgId, clientId);
  if (!ob || !balanceOwed(ob) || (ob.terms?.balanceTrigger ?? "on_approval") !== "on_approval") return;
  const { rows } = await getDb().execute(sql`
    select count(*)::int as n from deliverables
    where org_id = ${orgId} and client_id = ${clientId} and archived_at is null
      and status in ('editing', 'in_review', 'changes_requested')
  `);
  if (Number((rows[0] as { n: number }).n) > 0) return;
  await sendBalanceInvoice(orgId, clientId, null);
}

// ── Portal ────────────────────────────────────────────────────────────────

export type PortalOnboarding = {
  status: "sent" | "completed";
  billingType: "subscription" | "one_off";
  paymentMethod: "card" | "cash";
  planName: string | null;
  monthlyPence: number | null;
  projectTitle: string | null;
  extras: OnboardingExtra[];
  deliverables: string[];
  progress: OnboardingProgress;
  nextDocumentId: string | null;
  invoice: { id: string; paymentUrl: string | null; totalPence: number } | null;
};

export async function getPortalOnboarding(ctx: { orgId: string; clientId: string }): Promise<PortalOnboarding | null> {
  const res = await onboardingProgress(ctx.orgId, ctx.clientId, { checkStripe: true });
  if (!res || (res.ob.status !== "sent" && res.ob.status !== "completed")) return null;
  const { ob, progress } = res;
  const db = getDb();
  const [[plan], [doc], [inv]] = await Promise.all([
    ob.servicePlanId
      ? db.select({ name: servicePlans.name }).from(servicePlans).where(eq(servicePlans.id, ob.servicePlanId)).limit(1)
      : Promise.resolve([] as { name: string }[]),
    db
      .select({ id: clientDocuments.id })
      .from(clientDocuments)
      .where(
        and(
          eq(clientDocuments.orgId, ctx.orgId),
          eq(clientDocuments.clientId, ctx.clientId),
          eq(clientDocuments.status, "sent"),
        ),
      )
      .orderBy(asc(clientDocuments.createdAt))
      .limit(1),
    ob.invoiceId
      ? db
          .select({ id: invoices.id, paymentUrl: invoices.paymentUrl, totalPence: invoices.amountPence })
          .from(invoices)
          .where(and(eq(invoices.id, ob.invoiceId), isNull(invoices.archivedAt)))
          .limit(1)
      : Promise.resolve([] as { id: string; paymentUrl: string | null; totalPence: number }[]),
  ]);
  return {
    status: ob.status as "sent" | "completed",
    billingType: ob.billingType as "subscription" | "one_off",
    paymentMethod: ob.paymentMethod === "cash" ? "cash" : "card",
    planName: plan?.name ?? null,
    monthlyPence: ob.monthlyPence,
    projectTitle: ob.projectTitle,
    extras: ob.extras ?? [],
    deliverables: (ob.deliverables ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
    progress,
    nextDocumentId: doc?.id ?? null,
    invoice: inv ?? null,
  };
}
