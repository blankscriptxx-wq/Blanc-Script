import "server-only";
import { scriptMemoryContext } from "@/lib/data/script-memory";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clients, clientKnowledge, clientProfiles, scripts } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type KnowledgeKind =
  | "brand"
  | "audience"
  | "competitor"
  | "guideline"
  | "insight"
  | "performance";
export type KnowledgeStatus = "proposed" | "approved" | "dismissed";

export type ClientProfile = {
  id: string;
  clientId: string;
  clientName: string;
  brandSummary: string | null;
  audience: string | null;
  tone: string | null;
  pillars: string[];
  dosAndDonts: string | null;
  notes: string | null;
  researchedAt: Date | null;
  autoResearch: boolean;
};

export type KnowledgeRow = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  content: string;
  source: string | null;
  status: KnowledgeStatus;
  createdAt: Date;
};

async function assertClient(orgId: string, clientId: string) {
  const [c] = await getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!c) throw new Error("That client was not found in your workspace.");
  return c;
}

export async function getClientProfile(clientId: string): Promise<ClientProfile | null> {
  const user = await requireUser();
  const c = await assertClient(user.orgId, clientId);
  const [p] = await getDb()
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.orgId, user.orgId)))
    .limit(1);
  if (!p) {
    return {
      id: "",
      clientId,
      clientName: c.name,
      brandSummary: null,
      audience: null,
      tone: null,
      pillars: [],
      dosAndDonts: null,
      notes: null,
      researchedAt: null,
      autoResearch: true,
    };
  }
  return {
    id: p.id,
    clientId,
    clientName: c.name,
    brandSummary: p.brandSummary,
    audience: p.audience,
    tone: p.tone,
    pillars: p.pillars ?? [],
    dosAndDonts: p.dosAndDonts,
    notes: p.notes,
    researchedAt: p.researchedAt,
    autoResearch: p.autoResearch,
  };
}

const profileInput = z.object({
  brandSummary: z.string().trim().max(4000).nullable().optional(),
  audience: z.string().trim().max(2000).nullable().optional(),
  tone: z.string().trim().max(1000).nullable().optional(),
  pillars: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  dosAndDonts: z.string().trim().max(3000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  markResearched: z.boolean().optional(),
});

export async function upsertClientProfile(clientId: string, raw: z.input<typeof profileInput>) {
  const user = await requireUser();
  await assertClient(user.orgId, clientId);
  const data = profileInput.parse(raw);
  const db = getDb();
  const [existing] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.orgId, user.orgId)))
    .limit(1);
  const values = {
    brandSummary: data.brandSummary ?? null,
    audience: data.audience ?? null,
    tone: data.tone ?? null,
    pillars: data.pillars ?? [],
    dosAndDonts: data.dosAndDonts ?? null,
    notes: data.notes ?? null,
    updatedAt: new Date(),
    ...(data.markResearched ? { researchedAt: new Date() } : {}),
  };
  if (existing) {
    await db.update(clientProfiles).set(values).where(eq(clientProfiles.id, existing.id));
  } else {
    await db
      .insert(clientProfiles)
      .values({ orgId: user.orgId, clientId, ...values });
  }
}

// ── Knowledge ────────────────────────────────────────────────────────────────
export async function listKnowledge(
  clientId: string,
  status?: KnowledgeStatus,
): Promise<KnowledgeRow[]> {
  const user = await requireUser();
  const conds = [
    eq(clientKnowledge.orgId, user.orgId),
    eq(clientKnowledge.clientId, clientId),
  ];
  if (status) conds.push(eq(clientKnowledge.status, status));
  const rows = await getDb()
    .select({
      id: clientKnowledge.id,
      kind: clientKnowledge.kind,
      title: clientKnowledge.title,
      content: clientKnowledge.content,
      source: clientKnowledge.source,
      status: clientKnowledge.status,
      createdAt: clientKnowledge.createdAt,
    })
    .from(clientKnowledge)
    .where(and(...conds))
    .orderBy(desc(clientKnowledge.createdAt));
  return rows as KnowledgeRow[];
}

const knowledgeInput = z.object({
  clientId: z.string().uuid(),
  kind: z.enum(["brand", "audience", "competitor", "guideline", "insight", "performance"]),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(4000),
  source: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["proposed", "approved", "dismissed"]).default("proposed"),
});

export async function proposeKnowledge(raw: z.input<typeof knowledgeInput>) {
  const user = await requireUser();
  const data = knowledgeInput.parse(raw);
  await assertClient(user.orgId, data.clientId);
  const [row] = await getDb()
    .insert(clientKnowledge)
    .values({
      orgId: user.orgId,
      clientId: data.clientId,
      kind: data.kind,
      title: data.title,
      content: data.content,
      source: data.source ?? null,
      status: data.status,
      createdByUserId: user.id,
    })
    .returning({ id: clientKnowledge.id });
  return row;
}

export async function setKnowledgeStatus(id: string, status: KnowledgeStatus) {
  const user = await requireUser();
  await getDb()
    .update(clientKnowledge)
    .set({ status })
    .where(and(eq(clientKnowledge.id, id), eq(clientKnowledge.orgId, user.orgId)));
}

/** Assemble the client's brain into a prompt context block for the AI. */
export async function buildBrainContext(clientId: string): Promise<string> {
  const user = await requireUser();
  const c = await assertClient(user.orgId, clientId);
  const [profile, knowledge, scriptMemory] = await Promise.all([
    getClientProfile(clientId),
    listKnowledge(clientId, "approved"),
    scriptMemoryContext(user.orgId, clientId),
  ]);
  const lines: string[] = [`CLIENT: ${c.name}`];
  if (profile?.brandSummary) lines.push(`Brand: ${profile.brandSummary}`);
  if (profile?.audience) lines.push(`Audience: ${profile.audience}`);
  if (profile?.tone) lines.push(`Tone of voice: ${profile.tone}`);
  if (profile?.pillars?.length) lines.push(`Content pillars: ${profile.pillars.join(", ")}`);
  if (profile?.dosAndDonts) lines.push(`Do's & don'ts: ${profile.dosAndDonts}`);
  if (knowledge.length) {
    lines.push("Knowledge base (approved):");
    for (const k of knowledge.slice(0, 40)) lines.push(`- [${k.kind}] ${k.title}: ${k.content}`);
  }
  if (scriptMemory) lines.push(scriptMemory);
  return lines.join("\n");
}
