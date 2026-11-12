import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  clientContacts,
  clientDocuments,
  clientOnboardings,
  clients,
  deliverables,
  emailOutbox,
  invoices,
  organisations,
  portalLinks,
} from "@/lib/db/schema";
import { invoiceGrossPence } from "@/lib/data/finance";
import { sendOnboardingReminder } from "@/lib/data/onboarding";
import { appOrigin, emailConfigured, sendEmail } from "@/lib/email/send";

/**
 * Follow-up emails. A daily job (see vercel.json) chases, politely and a
 * limited number of times:
 *   - onboarding that hasn't been finished (login, documents, payment);
 *   - documents waiting to be accepted;
 *   - invoices past their due date;
 *   - cuts that have been waiting for the client's review.
 * Each reminder is logged in email_outbox, which is also how the job knows
 * when it last chased something. Workspaces can switch this off in Settings.
 */

const DAY = 24 * 60 * 60 * 1000;
const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const first = (name: string) => name.trim().split(" ")[0] || "there";

export type Recipient = { name: string; email: string; token: string | null };

/** Who to email for a client: everyone with a portal login, else the primary contact. */
export async function clientRecipients(orgId: string, clientId: string): Promise<Recipient[]> {
  const db = getDb();
  const links = await db
    .select({ name: portalLinks.label, email: portalLinks.email, token: portalLinks.token })
    .from(portalLinks)
    .where(
      and(
        eq(portalLinks.orgId, orgId),
        eq(portalLinks.clientId, clientId),
        isNull(portalLinks.revokedAt),
        isNotNull(portalLinks.email),
      ),
    );
  if (links.length) return links.map((l) => ({ name: l.name, email: l.email!, token: l.token }));
  const [contact] = await db
    .select({ name: clientContacts.name, email: clientContacts.email })
    .from(clientContacts)
    .where(and(eq(clientContacts.orgId, orgId), eq(clientContacts.clientId, clientId), isNotNull(clientContacts.email)))
    .orderBy(sql`${clientContacts.isPrimary} desc, ${clientContacts.createdAt} asc`)
    .limit(1);
  return contact?.email ? [{ name: contact.name, email: contact.email, token: null }] : [];
}

/** How many times, and when last, we've emailed about one thing. */
async function chased(kinds: string[], relatedId: string): Promise<{ count: number; last: Date | null }> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(distinct date_trunc('minute', ${emailOutbox.createdAt}))::int`, last: sql<Date | null>`max(${emailOutbox.createdAt})` })
    .from(emailOutbox)
    .where(and(inArray(emailOutbox.kind, kinds), eq(emailOutbox.relatedId, relatedId)));
  return { count: row?.count ?? 0, last: row?.last ? new Date(row.last) : null };
}

const due = (c: { count: number; last: Date | null }, max: number, gapDays: number) =>
  c.count < max && (!c.last || Date.now() - c.last.getTime() >= gapDays * DAY - 60 * 60 * 1000);

export async function followUpsEnabled(orgId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ settings: organisations.settings })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  return (row?.settings as { followUps?: boolean } | null)?.followUps !== false;
}

export async function setFollowUpsEnabled(orgId: string, on: boolean): Promise<void> {
  const db = getDb();
  const [row] = await db.select({ settings: organisations.settings }).from(organisations).where(eq(organisations.id, orgId)).limit(1);
  await db
    .update(organisations)
    .set({ settings: { ...((row?.settings ?? {}) as Record<string, unknown>), followUps: on } })
    .where(eq(organisations.id, orgId));
}

export type FollowUpSummary = { onboarding: number; documents: number; invoices: number; reviews: number };

/** One pass of the daily job for every workspace that has follow-ups on. */
export async function runFollowUps(): Promise<FollowUpSummary> {
  const out: FollowUpSummary = { onboarding: 0, documents: 0, invoices: 0, reviews: 0 };
  if (!emailConfigured()) return out;
  const db = getDb();
  const orgs = await db.select({ id: organisations.id }).from(organisations);

  for (const org of orgs) {
    if (!(await followUpsEnabled(org.id))) continue;

    // 1. Unfinished onboarding: first nudge after 2 days, then every 3, four in all.
    const open = await db
      .select({ id: clientOnboardings.id, clientId: clientOnboardings.clientId, invoiceId: clientOnboardings.invoiceId })
      .from(clientOnboardings)
      .where(and(eq(clientOnboardings.orgId, org.id), eq(clientOnboardings.status, "sent")));
    for (const ob of open) {
      const c = await chased(["welcome", "onboarding_reminder"], ob.id);
      // count includes the welcome itself
      if (c.count < 5 && c.last && Date.now() - c.last.getTime() >= (c.count === 1 ? 2 : 3) * DAY - 60 * 60 * 1000) {
        const res = await sendOnboardingReminder(org.id, ob.clientId).catch(() => null);
        if (res?.status === "sent") out.onboarding += 1;
      }
    }
    // Clients mid-onboarding are chased by that reminder alone.
    const onboardingClients = new Set(open.map((o) => o.clientId));
    const onboardingInvoices = new Set(open.map((o) => o.invoiceId).filter(Boolean));

    // 2. Documents sent 3+ days ago and not accepted: twice, 4 days apart.
    const docs = await db
      .select({ id: clientDocuments.id, clientId: clientDocuments.clientId, title: clientDocuments.title })
      .from(clientDocuments)
      .where(
        and(
          eq(clientDocuments.orgId, org.id),
          eq(clientDocuments.status, "sent"),
          lt(clientDocuments.sentAt, new Date(Date.now() - 3 * DAY)),
        ),
      );
    for (const d of docs) {
      if (onboardingClients.has(d.clientId)) continue;
      if (!due(await chased(["document_reminder"], d.id), 2, 4)) continue;
      for (const r of await clientRecipients(org.id, d.clientId)) {
        if (!r.token) continue;
        const res = await sendEmail({
          orgId: org.id,
          to: r.email,
          subject: `Reminder: ${d.title} is waiting for you`,
          heading: `${d.title} is waiting for your acceptance`,
          paragraphs: [`Hi ${first(r.name)},`, `Just a reminder that "${d.title}" is in your portal, ready for you to read and accept. It only takes a moment.`],
          button: { label: "Read and accept", url: `${appOrigin()}/portal/${r.token}/documents/${d.id}` },
          kind: "document_reminder",
          related: { type: "document", id: d.id },
        });
        if (res.status === "sent") out.documents += 1;
      }
    }

    // 3. Invoices a day or more past due: three reminders, 5 days apart.
    const overdue = await db
      .select({ id: invoices.id, clientId: invoices.clientId, number: invoices.number, gross: invoiceGrossPence, paymentUrl: invoices.paymentUrl })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, org.id),
          isNull(invoices.talentId),
          isNull(invoices.archivedAt),
          isNotNull(invoices.clientId),
          inArray(invoices.status, ["sent", "approved", "overdue"]),
          lt(invoices.dueAt, new Date(Date.now() - DAY)),
        ),
      );
    for (const inv of overdue) {
      if (!inv.clientId || onboardingInvoices.has(inv.id)) continue;
      if (!due(await chased(["invoice_reminder"], inv.id), 3, 5)) continue;
      for (const r of await clientRecipients(org.id, inv.clientId)) {
        const url = r.token ? `${appOrigin()}/portal/${r.token}/invoices/${inv.id}` : inv.paymentUrl;
        const res = await sendEmail({
          orgId: org.id,
          to: r.email,
          subject: `Reminder: invoice ${inv.number ?? ""} is overdue`.replace("  ", " "),
          heading: `Invoice ${inv.number ?? ""} — ${gbp(Number(inv.gross))} is overdue`,
          paragraphs: [
            `Hi ${first(r.name)},`,
            `Our records show invoice ${inv.number ?? ""} for ${gbp(Number(inv.gross))} hasn't been paid yet. If you've already paid, thank you — please ignore this.`,
            inv.paymentUrl ? "You can pay securely by card using the button below." : "Please get in touch if you need the payment details again.",
          ],
          button: url ? { label: inv.paymentUrl ? "View and pay invoice" : "View invoice", url } : undefined,
          kind: "invoice_reminder",
          related: { type: "invoice", id: inv.id },
        });
        if (res.status === "sent") out.invoices += 1;
      }
    }

    // 4. Cuts waiting 3+ days for the client's review: twice, 4 days apart.
    const waiting = await db
      .select({ id: deliverables.id, clientId: deliverables.clientId, title: deliverables.title })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.orgId, org.id),
          eq(deliverables.status, "in_review"),
          isNull(deliverables.archivedAt),
          isNotNull(deliverables.clientId),
          lt(deliverables.updatedAt, new Date(Date.now() - 3 * DAY)),
        ),
      );
    for (const d of waiting) {
      if (!d.clientId) continue;
      if (!due(await chased(["review_reminder"], d.id), 2, 4)) continue;
      for (const r of await clientRecipients(org.id, d.clientId)) {
        if (!r.token) continue;
        const res = await sendEmail({
          orgId: org.id,
          to: r.email,
          subject: `Reminder: "${d.title}" is ready for your review`,
          heading: "Your cut is waiting for you",
          paragraphs: [`Hi ${first(r.name)},`, `"${d.title}" is ready for you to watch. You can approve it or tell us what you'd like changed, right in your portal.`],
          button: { label: "Review now", url: `${appOrigin()}/portal/${r.token}/edits/${d.id}` },
          kind: "review_reminder",
          related: { type: "deliverable", id: d.id },
        });
        if (res.status === "sent") out.reviews += 1;
      }
    }
  }
  return out;
}

/** A subscription payment failed: ask the client to update their card (at most every 2 days). */
export async function sendPaymentFailedEmail(orgId: string, clientId: string): Promise<void> {
  if (!due(await chased(["payment_failed"], clientId), 99, 2)) return;
  const [c] = await getDb().select({ name: clients.name }).from(clients).where(eq(clients.id, clientId)).limit(1);
  for (const r of await clientRecipients(orgId, clientId)) {
    await sendEmail({
      orgId,
      to: r.email,
      subject: "Your Blanc Script payment didn't go through",
      heading: "We couldn't take your monthly payment",
      paragraphs: [
        `Hi ${first(r.name)},`,
        `Your card payment for ${c?.name ?? "your package"} didn't go through. This is usually an expired card or a bank check. We'll try again automatically, but updating your card now avoids any interruption.`,
      ],
      button: r.token ? { label: "Update my card", url: `${appOrigin()}/portal/${r.token}` } : undefined,
      kind: "payment_failed",
      related: { type: "client", id: clientId },
    });
  }
}

/** A one-off invoice was paid online: send the client their receipt. */
export async function sendInvoicePaidEmail(orgId: string, invoiceId: string): Promise<void> {
  const [inv] = await getDb()
    .select({ clientId: invoices.clientId, number: invoices.number, gross: invoiceGrossPence })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId), isNull(invoices.talentId)))
    .limit(1);
  if (!inv?.clientId) return;
  for (const r of await clientRecipients(orgId, inv.clientId)) {
    await sendEmail({
      orgId,
      to: r.email,
      subject: `Your Blanc Script invoice ${inv.number ?? ""} — paid`,
      heading: `Invoice ${inv.number ?? ""}: ${gbp(Number(inv.gross))} paid`,
      paragraphs: [
        `Hi ${first(r.name)},`,
        `Thank you — we've received your payment of ${gbp(Number(inv.gross))}. Your paid invoice is in your portal, where you can view or print it any time.`,
      ],
      button: r.token ? { label: "View invoice", url: `${appOrigin()}/portal/${r.token}/invoices/${invoiceId}` } : undefined,
      kind: "invoice",
      related: { type: "invoice", id: invoiceId },
    });
  }
}
