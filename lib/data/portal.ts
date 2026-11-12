import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clientContacts,
  clients,
  contentItems,
  deliverableVersions,
  deliverables,
  invoiceLineItems,
  invoices,
  organisations,
  portalLinks,
  reviewComments,
  shoots,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { getAuth } from "@/lib/auth/server";
import { appOrigin, sendEmail } from "@/lib/email/send";
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
  email: string | null;
  requiresLogin: boolean;
  claimed: boolean;
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
      email: portalLinks.email,
      requiresLogin: portalLinks.requiresLogin,
      claimed: sql<boolean>`${portalLinks.userId} is not null`,
      lastSeenAt: portalLinks.lastSeenAt,
      revokedAt: portalLinks.revokedAt,
      createdAt: portalLinks.createdAt,
    })
    .from(portalLinks)
    .where(and(eq(portalLinks.orgId, user.orgId), eq(portalLinks.clientId, clientId)))
    .orderBy(desc(portalLinks.createdAt));
}

/**
 * Give someone portal access. With an email, it is a LOGIN: they set a
 * password the first time and sign in after that. Without one, it is a plain
 * private link (anyone holding it can open the portal).
 */
export async function createPortalLink(clientId: string, label: string, email?: string | null) {
  const user = await requireUser();
  const id = z.string().uuid().parse(clientId);
  const name = z.string().trim().min(1, "Say who this access is for.").max(120).parse(label);
  const mail = email?.trim() ? z.string().trim().toLowerCase().email("Enter a valid email address.").parse(email) : null;
  await assertClientInOrg(id, user.orgId);
  if (mail) {
    const [dupe] = await getDb()
      .select({ id: portalLinks.id })
      .from(portalLinks)
      .where(and(eq(portalLinks.orgId, user.orgId), eq(portalLinks.email, mail), isNull(portalLinks.revokedAt)))
      .limit(1);
    if (dupe) throw new Error("That email already has portal access.");
  }
  const token = randomBytes(24).toString("base64url");
  const [row] = await getDb()
    .insert(portalLinks)
    .values({
      orgId: user.orgId,
      clientId: id,
      label: name,
      token,
      email: mail,
      requiresLogin: Boolean(mail),
      createdByUserId: user.id,
    })
    .returning({ id: portalLinks.id, token: portalLinks.token });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "portal.link_created",
    entityType: "client",
    entityId: id,
    meta: { label: name, login: Boolean(mail) },
  });
  return { ...row, orgId: user.orgId, email: mail, label: name };
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
  /** True when this access is a login (rather than a plain private link). */
  login: boolean;
};

export type PortalAccess =
  | { state: "ok"; ctx: PortalContext }
  | { state: "none" }
  /** A login invite that hasn't been used yet: the person sets a password. */
  | { state: "claim"; label: string; email: string; clientName: string }
  /** A login-protected portal, and nobody (or someone else) is signed in. */
  | { state: "signin"; email: string; clientName: string };

async function sessionUser(): Promise<{ id: string; email: string } | null> {
  try {
    const { data } = await getAuth().getSession();
    return data?.user ? { id: data.user.id, email: data.user.email } : null;
  } catch {
    return null;
  }
}

/** Work out what a visitor holding this portal address is allowed to see. */
export async function resolvePortalAccess(token: string): Promise<PortalAccess> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return { state: "none" };
  const [row] = await getDb()
    .select({
      linkId: portalLinks.id,
      orgId: portalLinks.orgId,
      clientId: portalLinks.clientId,
      viewerName: portalLinks.label,
      email: portalLinks.email,
      requiresLogin: portalLinks.requiresLogin,
      userId: portalLinks.userId,
      clientName: clients.name,
      agencyName: organisations.name,
      clientArchivedAt: clients.archivedAt,
    })
    .from(portalLinks)
    .innerJoin(clients, eq(portalLinks.clientId, clients.id))
    .innerJoin(organisations, eq(portalLinks.orgId, organisations.id))
    .where(and(eq(portalLinks.token, token), isNull(portalLinks.revokedAt)))
    .limit(1);
  if (!row || row.clientArchivedAt) return { state: "none" };

  if (row.requiresLogin) {
    const email = row.email ?? "";
    if (!row.userId) return { state: "claim", label: row.viewerName, email, clientName: row.clientName };
    const me = await sessionUser();
    if (!me || me.id !== row.userId) return { state: "signin", email, clientName: row.clientName };
  }

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
    state: "ok",
    ctx: {
      linkId: row.linkId,
      orgId: row.orgId,
      clientId: row.clientId,
      clientName: row.clientName,
      agencyName: row.agencyName,
      viewerName: row.viewerName,
      login: row.requiresLogin,
    },
  };
}

/** The portal context for this address, or null if the visitor may not see it. */
export async function resolvePortal(token: string): Promise<PortalContext | null> {
  const access = await resolvePortalAccess(token);
  return access.state === "ok" ? access.ctx : null;
}

/**
 * First visit on a login invite: create the person's account with the invited
 * email and their chosen password, and tie this portal access to it. If that
 * email already has an account, the password must match it.
 */
export async function claimPortalLogin(token: string, name: string, password: string, phone = ""): Promise<void> {
  const access = await resolvePortalAccess(token);
  if (access.state !== "claim") throw new Error("This invite has already been used. Please sign in.");
  const cleanName = z.string().trim().min(1, "Enter your name.").max(120).parse(name);
  const pass = z.string().min(8, "Choose a password of at least 8 characters.").max(200).parse(password);

  const auth = getAuth();
  const created = await auth.signUp.email({ email: access.email, name: cleanName, password: pass });
  if (created.error) {
    // Already registered (for example, they have access to another client).
    const signedIn = await auth.signIn.email({ email: access.email, password: pass });
    if (signedIn.error) {
      throw new Error(
        "An account already exists for this email. Enter that account's password to link it.",
      );
    }
  }
  // The password check above proved they own this email. (The new session
  // cookie isn't readable until the next request, so look the account up.)
  const userId = await userIdByEmail(access.email);
  if (!userId) throw new Error("We couldn't finish setting up your login. Please try again.");
  const claimed = await getDb()
    .update(portalLinks)
    .set({ userId, label: cleanName })
    .where(and(eq(portalLinks.token, token), isNull(portalLinks.userId), isNull(portalLinks.revokedAt)))
    .returning({ orgId: portalLinks.orgId, clientId: portalLinks.clientId });
  const link = claimed[0];
  if (!link) return;

  // Keep the contact number they gave against their contact record.
  const number = phone.trim().slice(0, 40);
  if (number) {
    const updated = await getDb()
      .update(clientContacts)
      .set({ phone: number, name: cleanName })
      .where(
        and(
          eq(clientContacts.orgId, link.orgId),
          eq(clientContacts.clientId, link.clientId),
          sql`lower(${clientContacts.email}) = ${access.email.toLowerCase()}`,
        ),
      )
      .returning({ id: clientContacts.id });
    if (!updated.length) {
      await getDb()
        .insert(clientContacts)
        .values({ orgId: link.orgId, clientId: link.clientId, name: cleanName, email: access.email, phone: number });
    }
  }
  await getDb().insert(activityLog).values({
    orgId: link.orgId,
    actorUserId: null,
    action: "portal.login_created",
    entityType: "client",
    entityId: link.clientId,
    meta: { by: cleanName },
  });
  // Second email of the pair: the invitation came first, this confirms the account.
  await sendEmail({
    orgId: link.orgId,
    to: access.email,
    subject: "Your Blanc Script account is ready",
    heading: `Thanks, ${cleanName.split(" ")[0]} — your account is set up`,
    paragraphs: [
      `Your login for the ${access.clientName} portal has been created.`,
      "It's where you'll review and approve work, read and accept your agreement, see your invoices and package, and send us footage.",
      "Sign in any time with this email address and the password you chose.",
    ],
    button: { label: "Open my portal", url: `${appOrigin()}/portal/${token}` },
    kind: "account_created",
    related: { type: "client", id: link.clientId },
  }).catch(() => {});
}

async function userIdByEmail(email: string): Promise<string | null> {
  const { rows } = await getDb().execute(
    sql`select id from neon_auth."user" where lower(email) = ${email.trim().toLowerCase()} limit 1`,
  );
  return (rows[0] as { id: string } | undefined)?.id ?? null;
}

async function portalHomeForUser(userId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ token: portalLinks.token })
    .from(portalLinks)
    .where(and(eq(portalLinks.userId, userId), isNull(portalLinks.revokedAt)))
    .orderBy(desc(portalLinks.lastSeenAt))
    .limit(1);
  return row ? `/portal/${row.token}` : null;
}

/**
 * Sign in to the portal. Returns the address of the person's portal (their
 * first, if they have access to several clients), or null if they have none.
 */
export async function signInToPortal(email: string, password: string): Promise<string | null> {
  const mail = z.string().trim().toLowerCase().email("Enter your email address.").parse(email);
  const { error } = await getAuth().signIn.email({ email: mail, password });
  if (error) throw new Error("That email and password don't match. Please try again.");
  const userId = await userIdByEmail(mail);
  return userId ? portalHomeForUser(userId) : null;
}

/** The signed-in person's portal address, if they have one. */
export async function portalHomeForSession(): Promise<string | null> {
  const me = await sessionUser();
  return me ? portalHomeForUser(me.id) : null;
}

export async function signOutOfPortal(): Promise<void> {
  await getAuth().signOut();
  const { clearVerified } = await import("@/lib/auth/mfa");
  await clearVerified();
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
  if (decision === "approved") {
    // A project that took a deposit: once everything is approved, the balance invoice goes out.
    const { balanceOnApproval } = await import("@/lib/data/onboarding");
    await balanceOnApproval(ctx.orgId, ctx.clientId).catch(() => {});
  }
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

/** Email (or re-send) someone their portal invite. Staff only. */
export async function sendPortalInvite(linkId: string): Promise<"sent" | "failed" | "not_configured" | "no_email"> {
  const user = await requireUser();
  const [link] = await getDb()
    .select({
      id: portalLinks.id,
      token: portalLinks.token,
      label: portalLinks.label,
      email: portalLinks.email,
      clientName: clients.name,
      claimed: sql<boolean>`${portalLinks.userId} is not null`,
    })
    .from(portalLinks)
    .innerJoin(clients, eq(portalLinks.clientId, clients.id))
    .where(and(eq(portalLinks.id, linkId), eq(portalLinks.orgId, user.orgId), isNull(portalLinks.revokedAt)))
    .limit(1);
  if (!link) throw new Error("That portal access was not found.");
  if (!link.email) return "no_email";
  const url = `${appOrigin()}/portal/${link.token}`;
  const result = await sendEmail({
    orgId: user.orgId,
    to: link.email,
    subject: `Your Blanc Script client portal — ${link.clientName}`,
    heading: `Your ${link.clientName} portal is ready`,
    paragraphs: [
      `Hi ${link.label.split(" ")[0]},`,
      "We've set up a private portal for you. It's where you can review and approve cuts, see your package and invoices, read and accept agreements, and send us footage.",
      link.claimed
        ? "Use the button below and sign in with your email and password."
        : "Use the button below to choose a password — that creates your login. After that, sign in any time at studio.blancscript.com/portal.",
    ],
    button: { label: link.claimed ? "Open my portal" : "Set up my login", url },
    kind: "portal_invite",
    related: { type: "client", id: link.id },
  });
  return result.status;
}

// ── Invoices (detail) ─────────────────────────────────────────────────────

export type PortalInvoiceDetail = {
  id: string;
  number: string | null;
  status: "sent" | "approved" | "paid" | "overdue";
  reference: string | null;
  terms: string | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  subtotalPence: number;
  taxRatePct: number | null;
  totalPence: number;
  paymentUrl: string | null;
  documentUrl: string | null;
  lines: { description: string; quantity: number; unitPence: number }[];
};

export async function getPortalInvoice(ctx: PortalContext, id: string): Promise<PortalInvoiceDetail | null> {
  const invoiceId = await portalInvoiceId(ctx, id);
  if (!invoiceId) return null;
  const db = getDb();
  const [[inv], lines] = await Promise.all([
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        reference: invoices.reference,
        terms: invoices.terms,
        issuedAt: invoices.issuedAt,
        dueAt: invoices.dueAt,
        paidAt: invoices.paidAt,
        subtotalPence: invoices.amountPence,
        taxRatePct: invoices.taxRatePct,
        totalPence: invoiceGrossPence,
        paymentUrl: invoices.paymentUrl,
        documentUrl: invoices.documentUrl,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1),
    db
      .select({
        description: invoiceLineItems.description,
        quantity: invoiceLineItems.quantity,
        unitPence: invoiceLineItems.unitPence,
      })
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(asc(invoiceLineItems.sortOrder)),
  ]);
  if (!inv) return null;
  return { ...(inv as Omit<PortalInvoiceDetail, "lines">), totalPence: Number(inv.totalPence), lines };
}
