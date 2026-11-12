import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clientContacts,
  clientDocuments,
  clientOnboardings,
  clients,
  documentTemplates,
  organisations,
  portalLinks,
  servicePlans,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { appOrigin, sendEmail } from "@/lib/email/send";
import { mergeTemplate } from "@/lib/documents/merge";
import type { PortalContext } from "@/lib/data/portal";

/**
 * Documents: reusable templates (service agreement, contract schedules…) and
 * the populated copies issued to each client. A client reads a sent document
 * in their portal and accepts it by typing their name; the OS records who,
 * when and the exact text they accepted (the copy is a snapshot).
 */

function requireDocs(user: { capabilities: Set<string> }) {
  if (!user.capabilities.has("can_contract") && !user.capabilities.has("can_settings")) {
    throw new Error("You do not have permission to manage documents.");
  }
}

// ── Templates ─────────────────────────────────────────────────────────────

export type TemplateRow = { id: string; name: string; body: string; updatedAt: Date };

export async function listTemplates(): Promise<TemplateRow[]> {
  const user = await requireUser();
  return getDb()
    .select({
      id: documentTemplates.id,
      name: documentTemplates.name,
      body: documentTemplates.body,
      updatedAt: documentTemplates.updatedAt,
    })
    .from(documentTemplates)
    .where(and(eq(documentTemplates.orgId, user.orgId), isNull(documentTemplates.archivedAt)))
    .orderBy(asc(documentTemplates.name));
}

const templateInput = z.object({
  name: z.string().trim().min(1, "Give the template a name.").max(160),
  body: z.string().trim().min(1, "The template is empty.").max(100_000),
});

export async function saveTemplate(id: string | null, raw: z.input<typeof templateInput>) {
  const user = await requireUser();
  requireDocs(user);
  const data = templateInput.parse(raw);
  if (id) {
    await getDb()
      .update(documentTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.orgId, user.orgId)));
  } else {
    await getDb().insert(documentTemplates).values({ orgId: user.orgId, ...data });
  }
}

export async function archiveTemplate(id: string) {
  const user = await requireUser();
  requireDocs(user);
  await getDb()
    .update(documentTemplates)
    .set({ archivedAt: new Date() })
    .where(and(eq(documentTemplates.id, id), eq(documentTemplates.orgId, user.orgId)));
}

// ── Client documents (staff) ──────────────────────────────────────────────

export type DocumentStatus = "draft" | "sent" | "accepted" | "void";
export type ClientDocumentRow = {
  id: string;
  title: string;
  body: string;
  status: DocumentStatus;
  sentAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string | null;
  createdAt: Date;
};

export async function listClientDocuments(clientId: string): Promise<ClientDocumentRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: clientDocuments.id,
      title: clientDocuments.title,
      body: clientDocuments.body,
      status: clientDocuments.status,
      sentAt: clientDocuments.sentAt,
      acceptedAt: clientDocuments.acceptedAt,
      acceptedByName: clientDocuments.acceptedByName,
      createdAt: clientDocuments.createdAt,
    })
    .from(clientDocuments)
    .where(and(eq(clientDocuments.orgId, user.orgId), eq(clientDocuments.clientId, clientId)))
    .orderBy(desc(clientDocuments.createdAt));
  return rows as ClientDocumentRow[];
}

/** Create a client's copy of a template, with the merge fields filled in. */
export async function createClientDocument(clientId: string, templateId: string) {
  const user = await requireUser();
  requireDocs(user);
  const db = getDb();
  const [[tpl], [c], [org]] = await Promise.all([
    db
      .select()
      .from(documentTemplates)
      .where(and(eq(documentTemplates.id, templateId), eq(documentTemplates.orgId, user.orgId)))
      .limit(1),
    db
      .select({
        id: clients.id,
        name: clients.name,
        retainerOverridePence: clients.retainerOverridePence,
        planName: servicePlans.name,
        planPricePence: servicePlans.pricePence,
      })
      .from(clients)
      .leftJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
      .where(and(eq(clients.id, clientId), eq(clients.orgId, user.orgId)))
      .limit(1),
    db.select().from(organisations).where(eq(organisations.id, user.orgId)).limit(1),
  ]);
  if (!tpl) throw new Error("That template was not found.");
  if (!c) throw new Error("That client was not found.");
  const [contact] = await db
    .select({ name: clientContacts.name, email: clientContacts.email })
    .from(clientContacts)
    .where(and(eq(clientContacts.orgId, user.orgId), eq(clientContacts.clientId, clientId)))
    .orderBy(desc(clientContacts.isPrimary), asc(clientContacts.createdAt))
    .limit(1);

  const fee = c.retainerOverridePence ?? c.planPricePence;
  const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
  // What was agreed at onboarding (add-ons, deliverables, a one-off project).
  const [ob] = await db
    .select()
    .from(clientOnboardings)
    .where(
      and(
        eq(clientOnboardings.orgId, user.orgId),
        eq(clientOnboardings.clientId, clientId),
        inArray(clientOnboardings.status, ["draft", "sent", "completed"]),
      ),
    )
    .orderBy(desc(clientOnboardings.createdAt))
    .limit(1);
  const extras = ob?.extras ?? [];
  const oneOff = ob?.billingType === "one_off";
  const body = mergeTemplate(tpl.body, {
    add_ons: oneOff
      ? ""
      : extras.map((x) => `${x.name} — ${gbp(x.pricePence)}${x.cadence === "monthly" ? " a month" : " (one-off)"}`).join("\n"),
    deliverables: ob?.deliverables ?? "",
    project_name: oneOff ? (ob?.projectTitle ?? "") : "",
    project_fee: oneOff ? gbp(extras.reduce((n, x) => n + x.pricePence, 0)) : "",
    client_name: c.name,
    contact_name: contact?.name ?? "",
    contact_email: contact?.email ?? "",
    package_name: oneOff ? "" : (c.planName ?? ""),
    monthly_fee:
      fee != null ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(fee / 100) : "",
    start_date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(new Date()),
    agency_name: org?.name ?? "Blanc Script",
    agency_address: org?.addressText ?? "",
    agency_email: org?.billingEmail ?? "",
  });
  const [row] = await db
    .insert(clientDocuments)
    .values({
      orgId: user.orgId,
      clientId,
      templateId: tpl.id,
      title: tpl.name,
      body,
      createdByUserId: user.id,
    })
    .returning({ id: clientDocuments.id });
  return row;
}

const docEdit = z.object({
  title: z.string().trim().min(1, "Give the document a title.").max(200),
  body: z.string().trim().min(1, "The document is empty.").max(100_000),
});

/** Edit a document. Only drafts can change: a sent document is what the client reads. */
export async function updateClientDocument(id: string, raw: z.input<typeof docEdit>) {
  const user = await requireUser();
  requireDocs(user);
  const data = docEdit.parse(raw);
  const rows = await getDb()
    .update(clientDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(clientDocuments.id, id), eq(clientDocuments.orgId, user.orgId), eq(clientDocuments.status, "draft")),
    )
    .returning({ id: clientDocuments.id });
  if (!rows.length) throw new Error("Only a draft can be edited. Void this one and create a new copy.");
}

/** Publish a draft to the client's portal and email their portal contacts. */
export async function sendClientDocument(id: string): Promise<{ emailed: number; emailStatus: string }> {
  const user = await requireUser();
  requireDocs(user);
  const db = getDb();
  const [doc] = await db
    .update(clientDocuments)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(clientDocuments.id, id), eq(clientDocuments.orgId, user.orgId), eq(clientDocuments.status, "draft")),
    )
    .returning({ id: clientDocuments.id, clientId: clientDocuments.clientId, title: clientDocuments.title });
  if (!doc) throw new Error("That document has already been sent.");

  // Everyone with portal access by email gets a link straight to the document.
  const people = await db
    .select({ label: portalLinks.label, email: portalLinks.email, token: portalLinks.token })
    .from(portalLinks)
    .where(
      and(eq(portalLinks.orgId, user.orgId), eq(portalLinks.clientId, doc.clientId), isNull(portalLinks.revokedAt)),
    );
  let emailed = 0;
  let emailStatus = people.some((p) => p.email) ? "sent" : "no_recipients";
  for (const p of people) {
    if (!p.email) continue;
    const res = await sendEmail({
      orgId: user.orgId,
      to: p.email,
      subject: `${doc.title} — ready for you to review`,
      heading: `${doc.title} is ready`,
      paragraphs: [
        `Hi ${p.label.split(" ")[0]},`,
        `We've added "${doc.title}" to your Blanc Script portal. Please read it and, if you're happy, accept it there — it only takes a moment.`,
      ],
      button: { label: "Read and accept", url: `${appOrigin()}/portal/${p.token}/documents/${doc.id}` },
      kind: "document",
      related: { type: "document", id: doc.id },
    });
    if (res.status === "sent") emailed += 1;
    else emailStatus = res.status;
  }
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "document.sent",
    entityType: "client",
    entityId: doc.clientId,
    meta: { title: doc.title },
  });
  return { emailed, emailStatus };
}

export async function voidClientDocument(id: string) {
  const user = await requireUser();
  requireDocs(user);
  await getDb()
    .update(clientDocuments)
    .set({ status: "void", updatedAt: new Date() })
    .where(
      and(
        eq(clientDocuments.id, id),
        eq(clientDocuments.orgId, user.orgId),
        inArray(clientDocuments.status, ["draft", "sent"]),
      ),
    );
}

// ── Client documents (portal) ─────────────────────────────────────────────

export type PortalDocument = {
  id: string;
  title: string;
  body: string;
  status: "sent" | "accepted";
  sentAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string | null;
};

const portalCols = {
  id: clientDocuments.id,
  title: clientDocuments.title,
  body: clientDocuments.body,
  status: clientDocuments.status,
  sentAt: clientDocuments.sentAt,
  acceptedAt: clientDocuments.acceptedAt,
  acceptedByName: clientDocuments.acceptedByName,
};

export async function listPortalDocuments(ctx: PortalContext): Promise<PortalDocument[]> {
  const rows = await getDb()
    .select(portalCols)
    .from(clientDocuments)
    .where(
      and(
        eq(clientDocuments.orgId, ctx.orgId),
        eq(clientDocuments.clientId, ctx.clientId),
        inArray(clientDocuments.status, ["sent", "accepted"]),
      ),
    )
    .orderBy(desc(clientDocuments.sentAt));
  return rows as PortalDocument[];
}

export async function getPortalDocument(ctx: PortalContext, id: string): Promise<PortalDocument | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const [row] = await getDb()
    .select(portalCols)
    .from(clientDocuments)
    .where(
      and(
        eq(clientDocuments.id, id),
        eq(clientDocuments.orgId, ctx.orgId),
        eq(clientDocuments.clientId, ctx.clientId),
        inArray(clientDocuments.status, ["sent", "accepted"]),
      ),
    )
    .limit(1);
  return (row as PortalDocument | undefined) ?? null;
}

/** The client accepts a document by typing their full name. */
export async function acceptPortalDocument(
  ctx: PortalContext,
  id: string,
  typedName: string,
  ip: string | null,
): Promise<void> {
  const name = z.string().trim().min(3, "Type your full name to accept.").max(160).parse(typedName);
  const [row] = await getDb()
    .update(clientDocuments)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByName: name,
      acceptedByLinkId: ctx.linkId,
      acceptedIp: ip?.slice(0, 64) ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clientDocuments.id, id),
        eq(clientDocuments.orgId, ctx.orgId),
        eq(clientDocuments.clientId, ctx.clientId),
        eq(clientDocuments.status, "sent"),
      ),
    )
    .returning({ id: clientDocuments.id, title: clientDocuments.title });
  if (!row) throw new Error("This document isn't waiting for acceptance.");
  await getDb().insert(activityLog).values({
    orgId: ctx.orgId,
    actorUserId: null,
    action: "document.accepted",
    entityType: "client",
    entityId: ctx.clientId,
    meta: { title: row.title, by: name, via: "portal" },
  });
}
