import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clientOnboardings,
  clients,
  proposals,
  servicePlans,
  type ProposalContent,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { clientRecipients } from "@/lib/data/followups";
import { aiConfigured, runJson } from "@/lib/ai/claude";
import { appOrigin, sendEmail, type EmailResult } from "@/lib/email/send";
import { defaultProposal } from "@/lib/proposals/defaults";

/**
 * Proposals: a branded web page built for one prospect or client, sent as a
 * private link. They read it without an account and can accept it by typing
 * their name. Staff functions are workspace-scoped; the public functions go
 * only by the unguessable token.
 */

const item = z.object({ title: z.string().trim().max(120), text: z.string().trim().max(600) });
const contentInput = z.object({
  preparedFor: z.string().trim().min(1).max(200),
  heroLines: z.array(z.string().trim().max(60)).min(1).max(4),
  heroIntro: z.string().trim().max(600),
  opportunity: z.object({
    heading: z.string().trim().max(160),
    body: z.string().trim().max(3000),
    stats: z.array(z.object({ value: z.string().trim().max(12), label: z.string().trim().max(200) })).max(3),
  }),
  whyNow: z.object({ heading: z.string().trim().max(160), body: z.string().trim().max(3000), cards: z.array(item).max(6) }),
  create: z.object({ heading: z.string().trim().max(160), body: z.string().trim().max(1500), pillars: z.array(item).max(12) }),
  process: z.object({ heading: z.string().trim().max(160), steps: z.array(item).max(8) }),
  investment: z.object({
    heading: z.string().trim().max(160),
    price: z.string().trim().max(60),
    priceNote: z.string().trim().max(120),
    body: z.string().trim().max(2000),
    includes: z.array(z.string().trim().max(120)).max(10),
  }),
  close: z.object({ heading: z.string().trim().max(160), body: z.string().trim().max(1500) }),
});

export type ProposalRow = {
  id: string;
  title: string;
  status: "draft" | "sent" | "accepted";
  token: string;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string | null;
  updatedAt: Date;
};

function requireProposals(user: { capabilities: Set<string> }) {
  if (!user.capabilities.has("can_see_money")) {
    throw new Error("You do not have permission to manage proposals.");
  }
}

const gbp = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: p % 100 ? 2 : 0 }).format(p / 100);

export async function listProposals(clientId: string): Promise<ProposalRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      token: proposals.token,
      sentAt: proposals.sentAt,
      viewedAt: proposals.viewedAt,
      acceptedAt: proposals.acceptedAt,
      acceptedByName: proposals.acceptedByName,
      updatedAt: proposals.updatedAt,
    })
    .from(proposals)
    .where(and(eq(proposals.orgId, user.orgId), eq(proposals.clientId, clientId)))
    .orderBy(desc(proposals.createdAt));
  return rows as ProposalRow[];
}

export async function getProposal(id: string) {
  const user = await requireUser();
  requireProposals(user);
  const [row] = await getDb()
    .select({ p: proposals, clientName: clients.name })
    .from(proposals)
    .innerJoin(clients, eq(proposals.clientId, clients.id))
    .where(and(eq(proposals.id, id), eq(proposals.orgId, user.orgId)))
    .limit(1);
  return row ? { ...row.p, clientName: row.clientName } : null;
}

/** What has been agreed or priced for this client, to pre-fill the investment section. */
async function investmentFor(orgId: string, clientId: string) {
  const db = getDb();
  const [c] = await db
    .select({ name: clients.name, override: clients.retainerOverridePence, planName: servicePlans.name, planPrice: servicePlans.pricePence })
    .from(clients)
    .leftJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!c) throw new Error("That client was not found.");
  const [ob] = await db
    .select()
    .from(clientOnboardings)
    .where(and(eq(clientOnboardings.orgId, orgId), eq(clientOnboardings.clientId, clientId), inArray(clientOnboardings.status, ["draft", "sent", "completed"])))
    .orderBy(desc(clientOnboardings.createdAt))
    .limit(1);
  return { client: c, ob: ob ?? null };
}

/** Start a proposal from the standard template, with any agreed pricing filled in. */
export async function createProposal(clientId: string): Promise<{ id: string }> {
  const user = await requireUser();
  requireProposals(user);
  const { client, ob } = await investmentFor(user.orgId, clientId);
  const content = defaultProposal(client.name);
  const extras = ob?.extras ?? [];
  if (ob?.billingType === "one_off") {
    content.investment.price = gbp(extras.reduce((n, x) => n + x.pricePence, 0));
    content.investment.priceNote = ob.projectTitle ?? "for the project";
    content.investment.body = "A fixed price for the project, covering everything listed below.";
    content.investment.includes = extras.map((x) => x.name).slice(0, 10);
  } else {
    // A draft onboarding is the newest thinking; otherwise use what the client is on now.
    const current = client.override ?? client.planPrice;
    const monthly = ob?.status === "draft" ? (ob.monthlyPence ?? current) : (current ?? ob?.monthlyPence);
    if (monthly) {
      content.investment.price = gbp(monthly);
      content.investment.priceNote = `a month${client.planName ? ` — ${client.planName}` : ""}`;
      if (extras.length) content.investment.includes = [...content.investment.includes, ...extras.map((x) => x.name)].slice(0, 10);
    }
  }
  if (ob?.deliverables) {
    const lines = ob.deliverables.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length) content.investment.includes = [...lines, ...content.investment.includes].slice(0, 10);
  }
  const [row] = await getDb()
    .insert(proposals)
    .values({
      orgId: user.orgId,
      clientId,
      token: randomBytes(24).toString("base64url"),
      title: `Proposal for ${client.name}`,
      content,
      createdByUserId: user.id,
    })
    .returning({ id: proposals.id });
  return row;
}

export async function saveProposal(id: string, title: string, raw: ProposalContent): Promise<void> {
  const user = await requireUser();
  requireProposals(user);
  const content = contentInput.parse(raw);
  const name = z.string().trim().min(1, "Give the proposal a title.").max(160).parse(title);
  const rows = await getDb()
    .update(proposals)
    .set({ title: name, content, updatedAt: new Date() })
    .where(and(eq(proposals.id, id), eq(proposals.orgId, user.orgId), sql`${proposals.status} <> 'accepted'`))
    .returning({ id: proposals.id });
  if (!rows.length) throw new Error("An accepted proposal can't be changed. Create a new one instead.");
}

export async function deleteProposal(id: string): Promise<void> {
  const user = await requireUser();
  requireProposals(user);
  await getDb()
    .delete(proposals)
    .where(and(eq(proposals.id, id), eq(proposals.orgId, user.orgId), sql`${proposals.status} <> 'accepted'`));
}

/** Publish the proposal and email the client their private link. */
export async function sendProposal(id: string): Promise<{ url: string; emailStatus: EmailResult["status"] | "no_recipients" }> {
  const user = await requireUser();
  requireProposals(user);
  const p = await getProposal(id);
  if (!p) throw new Error("That proposal was not found.");
  if (p.status === "draft") {
    await getDb().update(proposals).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(proposals.id, id));
    await getDb().insert(activityLog).values({
      orgId: user.orgId,
      actorUserId: user.id,
      action: "proposal.sent",
      entityType: "client",
      entityId: p.clientId,
      meta: { title: p.title },
    });
  }
  const url = `${appOrigin()}/proposal/${p.token}`;
  const people = await clientRecipients(user.orgId, p.clientId);
  let emailStatus: EmailResult["status"] | "no_recipients" = people.length ? "sent" : "no_recipients";
  for (const r of people) {
    const res = await sendEmail({
      orgId: user.orgId,
      to: r.email,
      subject: `Your Blanc Script proposal — ${p.clientName}`,
      heading: "Your proposal is ready",
      paragraphs: [
        `Hi ${r.name.trim().split(" ")[0]},`,
        `Thank you for your time. We've put together a proposal for ${p.clientName} — what we'd create, how it works and the investment.`,
        "It's a private page made just for you. If you're happy with it, you can accept it at the bottom and we'll get everything set up.",
      ],
      button: { label: "View your proposal", url },
      kind: "proposal",
      related: { type: "proposal", id: p.id },
    });
    if (res.status !== "sent") emailStatus = res.status;
  }
  return { url, emailStatus };
}

/** Ask the AI to write the proposal's copy from a short brief. Staff review before sending. */
export async function draftProposalWithAI(id: string, brief: string): Promise<ProposalContent> {
  const user = await requireUser();
  requireProposals(user);
  if (!aiConfigured()) throw new Error("AI isn't connected yet.");
  const p = await getProposal(id);
  if (!p) throw new Error("That proposal was not found.");
  const about = z.string().trim().min(10, "Tell the AI a little about the client first.").max(4000).parse(brief);
  const base = p.content;
  const out = await runJson<Partial<ProposalContent>>({
    system:
      "You write client proposals for Blanc Script, a strategy-led creative agency in Birmingham, UK that makes cinematic video, short-form social content and brand campaigns. Voice: confident, warm, plain British English, short punchy sentences, no jargon, no emojis, no invented statistics or follower counts. Never promise specific results.",
    prompt: `Write the copy for a proposal to "${p.clientName}".\n\nWhat we know about them:\n${about}\n\nReturn JSON with exactly these keys, keeping the same shape and similar lengths as this example (rewrite every value for this client; keep investment.price and investment.priceNote exactly as given):\n${JSON.stringify({ ...base, investment: base.investment })}\n\nRules: heroLines is 2 short lines (max 4 words each). opportunity.stats is 3 items whose "value" is a short number that is true from the brief or a plain count like 1 or 3 — never an invented metric. whyNow.cards is 4 items. create.pillars is 6 to 9 content ideas specific to this client. process.steps is the same 6 steps, lightly tailored.`,
    maxTokens: 4000,
  });
  const merged = contentInput.parse({
    ...base,
    ...out,
    preparedFor: base.preparedFor,
    investment: { ...base.investment, ...(out.investment ?? {}), price: base.investment.price, priceNote: base.investment.priceNote },
  });
  await getDb().update(proposals).set({ content: merged, updatedAt: new Date() }).where(eq(proposals.id, id));
  return merged;
}

// ── Public (token only) ───────────────────────────────────────────────────

export type PublicProposal = {
  title: string;
  status: "sent" | "accepted";
  content: ProposalContent;
  acceptedAt: Date | null;
  acceptedByName: string | null;
  agencyEmail: string;
};

/** The proposal behind a private link. `preview` lets signed-in staff see a draft. */
export async function getPublicProposal(token: string, opts: { preview?: boolean; track?: boolean } = {}): Promise<PublicProposal | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const db = getDb();
  const [p] = await db.select().from(proposals).where(eq(proposals.token, token)).limit(1);
  if (!p) return null;
  if (p.status === "draft" && !opts.preview) return null;
  if (opts.track && p.status === "sent" && !p.viewedAt) {
    await db.update(proposals).set({ viewedAt: new Date() }).where(eq(proposals.id, p.id));
    await db.insert(activityLog).values({
      orgId: p.orgId,
      actorUserId: null,
      action: "proposal.viewed",
      entityType: "client",
      entityId: p.clientId,
      meta: { title: p.title },
    });
  }
  return {
    title: p.title,
    status: p.status === "accepted" ? "accepted" : "sent",
    content: p.content,
    acceptedAt: p.acceptedAt,
    acceptedByName: p.acceptedByName,
    agencyEmail: "hello@blancscript.com",
  };
}

export async function acceptPublicProposal(token: string, typedName: string): Promise<void> {
  const name = z.string().trim().min(3, "Type your full name to accept.").max(160).parse(typedName);
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw new Error("This proposal link isn't valid.");
  const db = getDb();
  const [p] = await db
    .update(proposals)
    .set({ status: "accepted", acceptedAt: new Date(), acceptedByName: name, updatedAt: new Date() })
    .where(and(eq(proposals.token, token), eq(proposals.status, "sent")))
    .returning({ id: proposals.id, orgId: proposals.orgId, clientId: proposals.clientId, title: proposals.title });
  if (!p) throw new Error("This proposal has already been accepted, or is no longer available.");
  await db.insert(activityLog).values({
    orgId: p.orgId,
    actorUserId: null,
    action: "proposal.accepted",
    entityType: "client",
    entityId: p.clientId,
    meta: { title: p.title, by: name },
  });
}
