import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { shoots, clients, projects, activityLog, shootTalent, talent, scripts, organisations } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { setScriptStatus, tickShot } from "@/lib/data/scripts";
import { parseScript } from "@/lib/scripts/breakdown";

/**
 * Shoots data access (production bookings). EVERY query is scoped to the
 * caller's org_id — tenancy is enforced here (application layer) and, as
 * defence in depth, by Neon RLS.
 */

export type ShootRow = {
  id: string;
  title: string;
  status: "booked" | "on_site" | "wrapped" | "cancelled";
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  scheduledAt: Date | null;
  locationName: string | null;
  createdAt: Date;
};

export async function listShoots(): Promise<ShootRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: shoots.id,
      title: shoots.title,
      status: shoots.status,
      clientId: shoots.clientId,
      clientName: clients.name,
      projectId: shoots.projectId,
      projectName: projects.name,
      scheduledAt: shoots.scheduledAt,
      locationName: shoots.locationName,
      createdAt: shoots.createdAt,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(projects, eq(shoots.projectId, projects.id))
    .where(and(eq(shoots.orgId, user.orgId), isNull(shoots.archivedAt)))
    .orderBy(asc(shoots.scheduledAt));
  return rows as ShootRow[];
}

export async function getShoot(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: shoots.id,
      title: shoots.title,
      status: shoots.status,
      clientId: shoots.clientId,
      clientName: clients.name,
      projectId: shoots.projectId,
      projectName: projects.name,
      scheduledAt: shoots.scheduledAt,
      locationName: shoots.locationName,
      createdAt: shoots.createdAt,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(projects, eq(shoots.projectId, projects.id))
    .where(and(eq(shoots.id, id), eq(shoots.orgId, user.orgId)))
    .limit(1);
  return row ?? null;
}

export async function listClientOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
    .orderBy(asc(clients.name));
}

/** Projects for the shoot's project picker (with each project's client). */
export async function listProjectOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.orgId, user.orgId), isNull(projects.archivedAt)))
    .orderBy(asc(projects.name));
}

/** Resolve a project in the caller's workspace, or throw. */
async function requireProjectInOrg(projectId: string, orgId: string) {
  const [row] = await getDb()
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("That project was not found in your workspace.");
  return row;
}

/** Link a shoot to a project (or unlink it with null). */
export async function setShootProject(shootId: string, projectId: string | null) {
  const user = await requireUser();
  const id = z.string().uuid().parse(shootId);
  const project = projectId
    ? await requireProjectInOrg(z.string().uuid().parse(projectId), user.orgId)
    : null;

  const [current] = await getDb()
    .select({ clientId: shoots.clientId })
    .from(shoots)
    .where(and(eq(shoots.id, id), eq(shoots.orgId, user.orgId)))
    .limit(1);
  if (!current) throw new Error("That shoot was not found in your workspace.");

  await getDb()
    .update(shoots)
    .set({
      projectId: project?.id ?? null,
      // A shoot with no client takes its project's client.
      clientId: current.clientId ?? project?.clientId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(shoots.id, id), eq(shoots.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "shoot.updated",
    entityType: "shoot",
    entityId: id,
    meta: { projectId: project?.id ?? null },
  });
}

export const shootInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().trim().min(1).nullable().optional(),
  locationName: z.string().trim().max(200).nullable().optional(),
  /** Talent to pencil onto the shoot at booking time. */
  talentIds: z.array(z.string().uuid()).optional(),
});
export type ShootInput = z.infer<typeof shootInput>;

/** Talent for the booking picker (active talent only). */
export async function listTalentOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: talent.id, name: talent.name, ratePerHourPence: talent.ratePerHourPence })
    .from(talent)
    .where(and(eq(talent.orgId, user.orgId), eq(talent.status, "active")))
    .orderBy(asc(talent.name));
}

export async function createShoot(input: ShootInput) {
  const user = await requireUser();
  const data = shootInput.parse(input);

  let scheduledAt: Date | null = null;
  if (data.scheduledAt) {
    const parsed = new Date(data.scheduledAt);
    scheduledAt = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const project = data.projectId ? await requireProjectInOrg(data.projectId, user.orgId) : null;

  const [row] = await getDb()
    .insert(shoots)
    .values({
      orgId: user.orgId,
      // A shoot booked against a project takes that project's client by default.
      clientId: data.clientId ?? project?.clientId ?? null,
      projectId: project?.id ?? null,
      title: data.title,
      scheduledAt,
      locationName: data.locationName ?? null,
    })
    .returning({ id: shoots.id });

  // Pencil on any talent chosen during booking (org-scoped guard on ids).
  if (data.talentIds && data.talentIds.length) {
    const owned = await getDb()
      .select({ id: talent.id })
      .from(talent)
      .where(and(eq(talent.orgId, user.orgId), inArray(talent.id, data.talentIds)));
    const validIds = new Set(owned.map((t) => t.id));
    const toInsert = data.talentIds
      .filter((id) => validIds.has(id))
      .map((talentId) => ({
        orgId: user.orgId,
        shootId: row.id,
        talentId,
        status: "pencilled" as const,
      }));
    if (toInsert.length) await getDb().insert(shootTalent).values(toInsert);
  }

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "shoot.created",
    entityType: "shoot",
    entityId: row.id,
    meta: { title: data.title, talentCount: data.talentIds?.length ?? 0 },
  });
  return row;
}

// ── Run sheet: the scripts to film on a shoot ──────────────────────────────

export type RunSheetScript = {
  id: string;
  title: string;
  format: string;
  status: "idea" | "draft" | "review" | "approved" | "produced";
  hookVisual: string | null;
  hookScript: string | null;
  body: string | null;
  notes: string | null;
  style: "crew" | "self";
  shotsDone: number[];
};

export type RunSheet = {
  shoot: NonNullable<Awaited<ReturnType<typeof getShoot>>>;
  talent: { name: string; roleName: string | null; callTime: Date | null }[];
  scripts: RunSheetScript[];
};

/**
 * A shoot with its cast and the client's scripts to film: everything still to
 * shoot, plus anything ticked as filmed in the fortnight around this shoot.
 */
async function loadRunSheet(shoot: RunSheet["shoot"], orgId: string): Promise<RunSheet> {
  const db = getDb();
  const cast = await db
    .select({ name: talent.name, roleName: shootTalent.roleName, callTime: shootTalent.callTime })
    .from(shootTalent)
    .innerJoin(talent, eq(shootTalent.talentId, talent.id))
    .where(and(eq(shootTalent.shootId, shoot.id), eq(shootTalent.orgId, orgId)));
  let list: RunSheetScript[] = [];
  if (shoot.clientId) {
    const anchor = Math.min((shoot.scheduledAt ?? new Date()).getTime(), Date.now());
    const since = new Date(anchor - 14 * 86_400_000);
    const rows = await db
      .select({
        id: scripts.id,
        title: scripts.title,
        format: scripts.format,
        status: scripts.status,
        hookVisual: scripts.hookVisual,
        hookScript: scripts.hookScript,
        body: scripts.body,
        notes: scripts.notes,
        style: scripts.style,
        shotsDone: scripts.shotsDone,
        updatedAt: scripts.updatedAt,
        shootId: scripts.shootId,
        projectId: scripts.projectId,
      })
      .from(scripts)
      .where(and(eq(scripts.orgId, orgId), eq(scripts.clientId, shoot.clientId), isNull(scripts.archivedAt)));
    // Scripts written for this shoot, or for its project, or (when nothing
    // has been assigned anywhere) the client's scripts.
    const mine = rows.filter((s) => s.shootId === shoot.id || (!s.shootId && shoot.projectId && s.projectId === shoot.projectId));
    const pool = mine.length ? mine : rows.filter((s) => !s.shootId && !s.projectId);
    list = pool
      .filter((s) => (s.status === "produced" ? s.updatedAt >= since : s.status !== "idea"))
      .map(({ updatedAt: _u, shootId: _s, projectId: _p, ...s }) => ({ ...s, style: s.style === "self" ? ("self" as const) : ("crew" as const) }))
      // "Script 2 — …" before "Script 10 — …".
      .sort((a, b) => a.title.localeCompare(b.title, "en-GB", { numeric: true }));
  }
  return { shoot, talent: cast, scripts: list };
}

export async function getShootRunSheet(id: string): Promise<RunSheet | null> {
  const user = await requireUser();
  const shoot = await getShoot(id);
  return shoot ? loadRunSheet(shoot, user.orgId) : null;
}

// A share link is the shoot id plus a signature, so it needs no login and
// cannot be guessed. It shows the plan for the day only — never money.
const shareSig = (id: string) => {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("Sharing is not configured.");
  return createHmac("sha256", `callsheet:${secret}`).update(id).digest("base64url").slice(0, 24);
};

/** The private link to a shoot's call sheet (staff only). */
export async function shootShareToken(id: string): Promise<string> {
  await requireUser();
  return `${id}.${shareSig(id)}`;
}

/** The call sheet behind a share link: no account needed. */
export async function getSharedRunSheet(token: string): Promise<(RunSheet & { studio: string }) | null> {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const want = Buffer.from(shareSig(id));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [row] = await getDb()
    .select({
      id: shoots.id,
      orgId: shoots.orgId,
      title: shoots.title,
      status: shoots.status,
      clientId: shoots.clientId,
      clientName: clients.name,
      projectId: shoots.projectId,
      projectName: projects.name,
      scheduledAt: shoots.scheduledAt,
      locationName: shoots.locationName,
      createdAt: shoots.createdAt,
      studio: organisations.name,
    })
    .from(shoots)
    .innerJoin(organisations, eq(shoots.orgId, organisations.id))
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(projects, eq(shoots.projectId, projects.id))
    .where(and(eq(shoots.id, id), isNull(shoots.archivedAt)))
    .limit(1);
  if (!row) return null;
  const { orgId, studio, ...shoot } = row;
  return { ...(await loadRunSheet(shoot, orgId)), studio };
}

/** Tick a script as filmed (or untick it). Its edit and content item follow. */
export async function setScriptFilmed(scriptId: string, filmed: boolean) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({ id: scripts.id, body: scripts.body })
    .from(scripts)
    .where(and(eq(scripts.id, scriptId), eq(scripts.orgId, user.orgId)))
    .limit(1);
  if (!row) throw new Error("That script was not found.");
  // Ticking the whole script ticks every shot; unticking clears them.
  const shotsDone = filmed ? parseScript(row.body).map((_, i) => i) : [];
  await getDb().update(scripts).set({ shotsDone }).where(eq(scripts.id, scriptId));
  await setScriptStatus(scriptId, filmed ? "produced" : "approved");
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: filmed ? "script.filmed" : "script.unfilmed",
    entityType: "script",
    entityId: scriptId,
  });
}

/** Every live script on a project, in running order. */
export async function listProjectScripts(projectId: string): Promise<RunSheetScript[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: scripts.id,
      title: scripts.title,
      format: scripts.format,
      status: scripts.status,
      hookVisual: scripts.hookVisual,
      hookScript: scripts.hookScript,
      body: scripts.body,
      notes: scripts.notes,
      style: scripts.style,
      shotsDone: scripts.shotsDone,
    })
    .from(scripts)
    .where(and(eq(scripts.orgId, user.orgId), eq(scripts.projectId, projectId), isNull(scripts.archivedAt)));
  return rows
    .map((s) => ({ ...s, style: s.style === "self" ? ("self" as const) : ("crew" as const) }))
    .sort((a, b) => a.title.localeCompare(b.title, "en-GB", { numeric: true }));
}

/** Tick one shot of a script from the run sheet. */
export async function setShotDone(scriptId: string, index: number, done: boolean) {
  const user = await requireUser();
  return tickShot(user.orgId, scriptId, index, done);
}

/** The script an edit was made from, for the editor to cut to. */
export async function getScriptForDeliverable(deliverableId: string): Promise<RunSheetScript | null> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: scripts.id,
      title: scripts.title,
      format: scripts.format,
      status: scripts.status,
      hookVisual: scripts.hookVisual,
      hookScript: scripts.hookScript,
      body: scripts.body,
      notes: scripts.notes,
      style: scripts.style,
      shotsDone: scripts.shotsDone,
    })
    .from(scripts)
    .where(and(eq(scripts.orgId, user.orgId), eq(scripts.deliverableId, deliverableId), isNull(scripts.archivedAt)))
    .limit(1);
  return row ? { ...row, style: row.style === "self" ? "self" : "crew" } : null;
}
