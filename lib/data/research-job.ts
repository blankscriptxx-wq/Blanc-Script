import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityLog, clientKnowledge, clientProfiles, clients } from "@/lib/db/schema";
import { runJson, runResearch } from "@/lib/ai/claude";

/**
 * Client research (web search → proposed findings). Shared by the "Research
 * this client" button and the monthly scheduled refresh, so it takes an
 * explicit org + client rather than a signed-in user. Findings are only ever
 * PROPOSED — someone still approves them into the brain.
 */

const RESEARCH_SYSTEM =
  "You are a brand and content strategist for a creative video agency. Research the client's niche and competitors on the web. Produce a concise landscape: who the client is, their audience, 3-5 competitors (what works for each in their content), and 3-5 content opportunities (angles, formats or series the client could own). Report what you learn about the market and audience only. Do not include project management advice, scheduling reminders, or instructions to the agency. British English.";

const STRUCTURE_SYSTEM =
  'Extract a strategy brief from this research as JSON with keys: brandSummary, audience, tone, pillars (array), competitors (array of {name, insight}), opportunities (array of {title, detail}). Competitors must be real named brands with what works in their content. Opportunities must be content ideas or angles — lasting knowledge about what to make — never tasks, reminders, deadlines or admin for the agency (omit anything like "confirm the date" or "lock the schedule").';

type Structured = {
  brandSummary?: string;
  audience?: string;
  tone?: string;
  pillars?: string[];
  competitors?: { name: string; insight: string }[];
  opportunities?: { title: string; detail: string }[];
};

export type ResearchOutcome = { report: string; proposed: number };

export async function runClientResearch(orgId: string, clientId: string): Promise<ResearchOutcome> {
  const db = getDb();
  const [client] = await db
    .select({ name: clients.name })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) throw new Error("Client not found.");

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.orgId, orgId)))
    .limit(1);

  const report = await runResearch({
    system: RESEARCH_SYSTEM,
    prompt: `Client: ${client.name}. ${profile?.brandSummary ? `What we know: ${profile.brandSummary}` : ""} ${profile?.audience ? `Audience: ${profile.audience}` : ""}`.trim(),
    maxTokens: 2500,
  });
  if (!report.trim()) throw new Error("Research came back empty. Please try again.");

  const structured = await runJson<Structured>({
    system: STRUCTURE_SYSTEM,
    prompt: report,
    // Generous: a truncated reply is unparseable and would lose everything.
    maxTokens: 4000,
  }).catch(() => ({}) as Structured);

  // Seed profile fields only where currently empty (a draft to refine).
  const seed = {
    brandSummary: profile?.brandSummary ?? structured.brandSummary ?? null,
    audience: profile?.audience ?? structured.audience ?? null,
    tone: profile?.tone ?? structured.tone ?? null,
    pillars: profile?.pillars?.length ? profile.pillars : (structured.pillars ?? []),
    researchedAt: new Date(),
    updatedAt: new Date(),
  };
  if (profile) {
    await db.update(clientProfiles).set(seed).where(eq(clientProfiles.id, profile.id));
  } else {
    await db.insert(clientProfiles).values({ orgId, clientId, ...seed });
  }

  // Don't propose something the brain already holds (in any state).
  const existing = await db
    .select({ title: clientKnowledge.title })
    .from(clientKnowledge)
    .where(and(eq(clientKnowledge.clientId, clientId), eq(clientKnowledge.orgId, orgId)));
  const seen = new Set(existing.map((e) => e.title.trim().toLowerCase()));

  const proposals: { kind: "competitor" | "insight"; title: string; content: string }[] = [];
  for (const c of structured.competitors ?? []) {
    proposals.push({ kind: "competitor", title: (c.name ?? "").slice(0, 200), content: c.insight ?? "" });
  }
  for (const o of structured.opportunities ?? []) {
    proposals.push({ kind: "insight", title: (o.title ?? "").slice(0, 200), content: o.detail ?? "" });
  }
  const structuredAny = proposals.length > 0;
  if (!structuredAny) {
    // Never lose a finished report: propose the report itself.
    proposals.push({
      kind: "insight",
      title: `Research report — ${new Date().toISOString().slice(0, 10)}`,
      content: report,
    });
  }

  let proposed = 0;
  for (const p of proposals) {
    const title = p.title.trim();
    const content = p.content.trim().slice(0, 4000);
    if (!title || !content || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    await db.insert(clientKnowledge).values({
      orgId,
      clientId,
      kind: p.kind,
      title,
      content,
      source: "research",
      status: "proposed",
    });
    proposed += 1;
  }
  return { report, proposed };
}

/**
 * Clients due an automatic refresh: active, opted in, with a brand summary to
 * research from, and not researched in the last 30 days. Oldest first.
 */
export async function clientsDueResearch(limit: number) {
  return getDb()
    .select({ orgId: clientProfiles.orgId, clientId: clientProfiles.clientId, name: clients.name })
    .from(clientProfiles)
    .innerJoin(clients, eq(clientProfiles.clientId, clients.id))
    .where(
      and(
        eq(clientProfiles.autoResearch, true),
        eq(clients.status, "active"),
        isNull(clients.archivedAt),
        sql`coalesce(${clientProfiles.brandSummary}, '') <> ''`,
        sql`(${clientProfiles.researchedAt} is null or ${clientProfiles.researchedAt} < now() - interval '30 days')`,
      ),
    )
    .orderBy(sql`${clientProfiles.researchedAt} asc nulls first`, asc(clients.name))
    .limit(limit);
}

export async function logScheduledResearch(orgId: string, clientId: string, proposed: number) {
  await getDb().insert(activityLog).values({
    orgId,
    actorUserId: null,
    action: "client.research_refreshed",
    entityType: "client",
    entityId: clientId,
    meta: { proposed, via: "schedule" },
  });
}

/** Turn the monthly refresh on or off for a client (profile is created if needed). */
export async function setAutoResearch(orgId: string, clientId: string, enabled: boolean) {
  const db = getDb();
  const [profile] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.orgId, orgId)))
    .limit(1);
  if (profile) {
    await db
      .update(clientProfiles)
      .set({ autoResearch: enabled, updatedAt: new Date() })
      .where(eq(clientProfiles.id, profile.id));
  } else {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
      .limit(1);
    if (!client) throw new Error("Client not found.");
    await db.insert(clientProfiles).values({ orgId, clientId, autoResearch: enabled });
  }
}
