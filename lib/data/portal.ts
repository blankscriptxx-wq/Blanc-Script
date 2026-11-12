import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clients,
  contentItems,
  deliverableVersions,
  deliverables,
  invoices,
  organisations,
  portalLinks,
  reviewComments,
  shoots,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { invoiceGrossPence } from "@/lib/data/finance";

/**
 * Client portal. A client is given an unguessable link (no password); the
 * token resolves to exactly one client in one workspace and every query below
 * is scoped to that pair. Clients can see work that has been sent for review,
 * upcoming shoots, the content schedule and their invoices — never drafts,
 * internal notes, costs, talent pay or other clients.
 */

// ── Staff side: manage links ──────────────────────────────────────────────

export type PortalLinkRow = {
  id: string;
  label: string;
  token: string;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

async function assertClientInOrg(clientId: string, orgId: string) {
  const [row] = await getDb()
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("That client was not found in your workspace.");
}

export async function listPortalLinks(clientId: string): Promise<PortalLinkRow[]> {
  const user = await requireUser();
  return getDb()
    .select({
      id: portalLinks.id,
      label: portalLinks.label,
      token: portalLinks.token,
      lastSeenAt: portalLinks.lastSeenAt,
      revokedAt: portalLinks.revokedAt,
      createdAt: portalLinks.createdAt,
    })
    .from(portalLinks)
    .where(and(eq(portalLinks.orgId, user.orgId), eq(portalLinks.clientId, clientId)))
    .orderBy(desc(portalLinks.createdAt));
}

export async function createPortalLink(clientId: string, label: string) {
  const user = await requireUser();
  const id = z.string().uuid().parse(clientId);
  const name = z.string().trim().min(1, "Say who this link is for.").max(120).parse(label);
  await assertClientInOrg(id, user.orgId);
  const token = randomBytes(24).toString("base64url");
  const [row] = await getDb()
    .insert(portalLinks)
    .values({ orgId: user.orgId, clientId: id, label: name, token, createdByUserId: user.id })
    .returning({ id: portalLinks.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "portal.link_created",
    entityType: "client",
    entityId: id,
    meta: { label: name },
  });
  return row;
}

export async function revokePortalLink(linkId: string) {
  const user = await requireUser();
  await getDb()
    .update(portalLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(portalLinks.id, linkId), eq(portalLinks.orgId, user.orgId)));
}

// ── Client side: everything below is driven by the token ──────────────────

export type PortalContext = {
  linkId: string;
  orgId: string;
  clientId: string;
  clientName: string;
  agencyName: string;
  viewerName: string;
};

/** Resolve a portal token. Returns null for unknown or revoked links. */
export async function resolvePortal(token: string): Promise<PortalContext | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const [row] = await getDb()
    .select({
      linkId: portalLinks.id,
      orgId: portalLinks.orgId,
      clientId: portalLinks.clientId,
      viewerName: portalLinks.label,
      clientName: clients.name,
      agencyName: organisations.name,
      clientArchivedAt: clients.archivedAt,
    })
    .from(portalLinks)
    .innerJoin(clients, eq(portalLinks.clientId, clients.id))
    .innerJoin(organisations, eq(portalLinks.orgId, organisations.id))
    .where(and(eq(portalLinks.token, token), isNull(portalLinks.revokedAt)))
    .limit(1);
  if (!row || row.clientArchivedAt) return null;
  // Best-effort "last seen" (at most one write a minute).
  await getDb()
    .update(portalLinks)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(portalLinks.id, row.linkId),
        sql`(${portalLinks.lastSeenAt} is null or ${portalLinks.lastSeenAt} < now() - interval '1 minute')`,
      ),
    )
    .catch(() => {});
  return {
    linkId: row.linkId,
    orgId: row.orgId,
    clientId: row.clientId,
    clientName: row.clientName,
    agencyName: row.agencyName,
    viewerName: row.viewerName,
  };
}

/** Deliverable states a client is allowed to see (never work still in the edit). */
const CLIENT_VISIBLE = ["in_review", "changes_requested", "approved", "published"] as const;
export type PortalDeliverableStatus = (typeof CLIENT_VISIBLE)[number];

export type PortalHome = {
  deliverables: {
    id: string;
    title: string;
    status: PortalDeliverableStatus;
    versionLabel: string | null;
    dueAt: Date | null;
    updatedAt: Date;
  }[];
  shoots: { id: string; title: string; scheduledAt: Date | null; locationName: string | null }[];
  content: {
    id: string;
    title: string;
    channel: string;
    status: string;
    scheduledFor: Date | null;
  }[];
  invoices: {
    id: string;
    number: string | null;
    status: "sent" | "approved" | "paid" | "overdue";
    grossPence: number;
    dueAt: Date | null;
    paidAt: Date | null;
    paymentUrl: string | null;
  }[];
};

export async function getPortalHome(ctx: PortalContext): Promise<PortalHome> {
  const db = getDb();
  const [d, s, c, i] = await Promise.all([
    db
      .select({
        id: deliverables.id,
        title: deliverables.title,
        status: deliverables.status,
        versionLabel: deliverables.versionLabel,
        dueAt: deliverables.dueAt,
        updatedAt: deliverables.updatedAt,
      })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.orgId, ctx.orgId),
          eq(deliverables.clientId, ctx.clientId),
          isNull(deliverables.archivedAt),
          inArray(deliverables.status, [...CLIENT_VISIBLE]),
        ),
      )
      .orderBy(desc(deliverables.updatedAt)),
    db
      .select({
        id: shoots.id,
        title: shoots.title,
        scheduledAt: shoots.scheduledAt,
        locationName: shoots.locationName,
      })
      .from(shoots)
      .where(
        and(
          eq(shoots.orgId, ctx.orgId),
          eq(shoots.clientId, ctx.clientId),
          isNull(shoots.archivedAt),
          inArray(shoots.status, ["booked", "on_site"]),
          gte(shoots.scheduledAt, sql`now() - interval '1 day'`),
        ),
      )
      .orderBy(asc(shoots.scheduledAt)),
    db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        channel: contentItems.channel,
        status: contentItems.status,
        scheduledFor: contentItems.scheduledFor,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, ctx.orgId),
          eq(contentItems.clientId, ctx.clientId),
          isNull(contentItems.archivedAt),
          inArray(contentItems.status, ["scheduled", "posted"]),
        ),
      )
      .orderBy(asc(contentItems.scheduledFor)),
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        grossPence: invoiceGrossPence,
        dueAt: invoices.dueAt,
        paidAt: invoices.paidAt,
        paymentUrl: invoices.paymentUrl,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, ctx.orgId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.talentId),
          isNull(invoices.archivedAt),
          inArray(invoices.status, ["sent", "approved", "paid", "overdue"]),
        ),
      )
      .orderBy(desc(invoices.createdAt)),
  ]);
  return {
    deliverables: d as PortalHome["deliverables"],
    shoots: s,
    content: c,
    invoices: i.map((r) => ({ ...r, grossPence: Number(r.grossPence) })) as PortalHome["invoices"],
  };
}

export type PortalDeliverable = {
  id: string;
  title: string;
  status: PortalDeliverableStatus;
  versionLabel: string | null;
  previewUrl: string | null;
  dueAt: Date | null;
  versions: { id: string; label: string; previewUrl: string | null; note: string | null; createdAt: Date }[];
  comments: {
    id: string;
    body: string;
    authorName: string;
    fromClient: boolean;
    timecodeSeconds: number | null;
    createdAt: Date;
  }[];
};

/** The deliverable, if it belongs to this client and is visible to them. */
async function visibleDeliverable(ctx: PortalContext, id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const [row] = await getDb()
    .select({
      id: deliverables.id,
      title: deliverables.title,
      status: deliverables.status,
      versionLabel: deliverables.versionLabel,
      previewUrl: deliverables.previewUrl,
      dueAt: deliverables.dueAt,
    })
    .from(deliverables)
    .where(
      and(
        eq(deliverables.id, id),
        eq(deliverables.orgId, ctx.orgId),
        eq(deliverables.clientId, ctx.clientId),
        isNull(deliverables.archivedAt),
        inArray(deliverables.status, [...CLIENT_VISIBLE]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPortalDeliverable(
  ctx: PortalContext,
  id: string,
): Promise<PortalDeliverable | null> {
  const d = await visibleDeliverable(ctx, id);
  if (!d) return null;
  const db = getDb();
  const [versions, comments] = await Promise.all([
    db
      .select({
        id: deliverableVersions.id,
        label: deliverableVersions.label,
        previewUrl: deliverableVersions.previewUrl,
        note: deliverableVersions.note,
        createdAt: deliverableVersions.createdAt,
      })
      .from(deliverableVersions)
      .where(and(eq(deliverableVersions.deliverableId, id), eq(deliverableVersions.orgId, ctx.orgId)))
      .orderBy(desc(deliverableVersions.createdAt)),
    db.execute(sql`
      select
        rc.id as "id",
        rc.body as "body",
        coalesce(rc.author_name, u.name, ${ctx.agencyName}) as "authorName",
        (rc.portal_link_id is not null) as "fromClient",
        rc.timecode_seconds as "timecodeSeconds",
        rc.created_at as "createdAt"
      from review_comments rc
      left join neon_auth."user" u on u.id = rc.author_user_id
      where rc.deliverable_id = ${id} and rc.org_id = ${ctx.orgId}
      order by rc.created_at asc
    `),
  ]);
  return {
    ...(d as Omit<PortalDeliverable, "versions" | "comments">),
    versions,
    comments: (comments.rows as unknown as PortalDeliverable["comments"]).map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    })),
  };
}

const commentInput = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(4000),
  timecodeSeconds: z.number().int().min(0).max(86_400).nullable(),
});

export async function addPortalComment(
  ctx: PortalContext,
  deliverableId: string,
  input: z.input<typeof commentInput>,
) {
  const d = await visibleDeliverable(ctx, deliverableId);
  if (!d) throw new Error("That item isn't available.");
  const data = commentInput.parse(input);
  await getDb().insert(reviewComments).values({
    orgId: ctx.orgId,
    deliverableId: d.id,
    portalLinkId: ctx.linkId,
    authorName: ctx.viewerName,
    body: data.body,
    timecodeSeconds: data.timecodeSeconds,
  });
  await getDb().insert(activityLog).values({
    orgId: ctx.orgId,
    actorUserId: null,
    action: "deliverable.client_commented",
    entityType: "deliverable",
    entityId: d.id,
    meta: { by: ctx.viewerName, via: "portal" },
  });
}

/** The client's decision on a cut that is waiting for review. */
export async function setPortalDecision(
  ctx: PortalContext,
  deliverableId: string,
  decision: "approved" | "changes_requested",
) {
  const d = await visibleDeliverable(ctx, deliverableId);
  if (!d) throw new Error("That item isn't available.");
  if (d.status === "published") throw new Error("This has already been published.");
  await getDb()
    .update(deliverables)
    .set({ status: decision, updatedAt: new Date() })
    .where(and(eq(deliverables.id, d.id), eq(deliverables.orgId, ctx.orgId)));
  await getDb().insert(activityLog).values({
    orgId: ctx.orgId,
    actorUserId: null,
    action: decision === "approved" ? "deliverable.client_approved" : "deliverable.client_requested_changes",
    entityType: "deliverable",
    entityId: d.id,
    meta: { by: ctx.viewerName, via: "portal" },
  });
}

/** An invoice this client may pay or check: theirs, client-facing, not a draft. */
export async function portalInvoiceId(ctx: PortalContext, invoiceId: string): Promise<string | null> {
  if (!z.string().uuid().safeParse(invoiceId).success) return null;
  const [row] = await getDb()
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, ctx.orgId),
        eq(invoices.clientId, ctx.clientId),
        isNull(invoices.talentId),
        isNull(invoices.archivedAt),
        inArray(invoices.status, ["sent", "approved", "paid", "overdue"]),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}
