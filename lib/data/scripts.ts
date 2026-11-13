import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, clients, contentItems, deliverables, projects, scripts, shoots } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type ScriptFormat = "reel" | "tiktok" | "youtube_short" | "youtube_long" | "ad" | "other";
export type ScriptStatus = "idea" | "draft" | "review" | "approved" | "produced";

export type ScriptRow = {
  id: string;
  title: string;
  format: ScriptFormat;
  status: ScriptStatus;
  hookVisual: string | null;
  hookScript: string | null;
  body: string | null;
  notes: string | null;
  contentItemId: string | null;
  parentScriptId: string | null;
  createdAt: Date;
};

async function assertClient(orgId: string, clientId: string) {
  const [c] = await getDb()
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!c) throw new Error("That client was not found in your workspace.");
}

export async function listScripts(clientId: string): Promise<ScriptRow[]> {
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
      contentItemId: scripts.contentItemId,
      parentScriptId: scripts.parentScriptId,
      createdAt: scripts.createdAt,
    })
    .from(scripts)
    .where(
      and(
        eq(scripts.orgId, user.orgId),
        eq(scripts.clientId, clientId),
        isNull(scripts.archivedAt),
      ),
    )
    .orderBy(desc(scripts.createdAt));
  return rows as ScriptRow[];
}

export async function getScript(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: scripts.id,
      clientId: scripts.clientId,
      title: scripts.title,
      body: scripts.body,
      hookScript: scripts.hookScript,
      notes: scripts.notes,
    })
    .from(scripts)
    .where(and(eq(scripts.id, id), eq(scripts.orgId, user.orgId)))
    .limit(1);
  return row ?? null;
}

export async function appendScriptNotes(id: string, note: string) {
  const user = await requireUser();
  const s = await getScript(id);
  if (!s) return;
  const merged = [s.notes, note].filter(Boolean).join("\n");
  await getDb()
    .update(scripts)
    .set({ notes: merged.slice(0, 2000), updatedAt: new Date() })
    .where(and(eq(scripts.id, id), eq(scripts.orgId, user.orgId)));
}

export const scriptInput = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  format: z.enum(["reel", "tiktok", "youtube_short", "youtube_long", "ad", "other"]).default("reel"),
  status: z.enum(["idea", "draft", "review", "approved", "produced"]).default("idea"),
  hookVisual: z.string().trim().max(1000).nullable().optional(),
  hookScript: z.string().trim().max(1000).nullable().optional(),
  body: z.string().trim().max(8000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  parentScriptId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  shootId: z.string().uuid().nullable().optional(),
});

export async function createScript(raw: z.input<typeof scriptInput>) {
  const user = await requireUser();
  const data = scriptInput.parse(raw);
  await assertClient(user.orgId, data.clientId);
  const [row] = await getDb()
    .insert(scripts)
    .values({
      orgId: user.orgId,
      clientId: data.clientId,
      title: data.title,
      format: data.format,
      status: data.status,
      hookVisual: data.hookVisual ?? null,
      hookScript: data.hookScript ?? null,
      body: data.body ?? null,
      notes: data.notes ?? null,
      parentScriptId: data.parentScriptId ?? null,
      projectId: data.projectId ?? null,
      shootId: data.shootId ?? null,
    })
    .returning({ id: scripts.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "script.created",
    entityType: "script",
    entityId: row.id,
    meta: { title: data.title, clientId: data.clientId },
  });
  return row;
}

export async function setScriptStatus(id: string, status: ScriptStatus) {
  const user = await requireUser();
  await getDb()
    .update(scripts)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(scripts.id, id), eq(scripts.orgId, user.orgId)));
  await syncScriptPipeline(user.orgId, id);
}

/**
 * One video, one path: script → shoot → edit → content. Whenever a script's
 * status changes, its edit and its content-calendar item are created or moved
 * to match, so nothing says "editing" before it has been filmed.
 *
 *   approved  → edit "To film",  content "Filming"
 *   produced  → edit "Editing",  content "Editing"   (i.e. filmed)
 */
export async function syncScriptPipeline(orgId: string, scriptId: string) {
  const db = getDb();
  const [s] = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, scriptId), eq(scripts.orgId, orgId)))
    .limit(1);
  if (!s || s.archivedAt || (s.status !== "approved" && s.status !== "produced")) return;
  const filmed = s.status === "produced";

  let contentItemId = s.contentItemId;
  if (!contentItemId) {
    const channel = s.format === "tiktok" ? "tiktok" : s.format === "youtube_short" || s.format === "youtube_long" ? "youtube" : "instagram";
    const [ci] = await db
      .insert(contentItems)
      .values({
        orgId,
        clientId: s.clientId,
        title: s.title,
        channel,
        status: filmed ? "editing" : "filming",
        body: [s.hookScript ? `Hook: ${s.hookScript}` : null, s.body].filter(Boolean).join("\n\n") || null,
      })
      .returning({ id: contentItems.id });
    contentItemId = ci.id;
  } else {
    await db
      .update(contentItems)
      .set({ status: filmed ? "editing" : "filming", updatedAt: new Date() })
      .where(
        and(
          eq(contentItems.id, contentItemId),
          eq(contentItems.orgId, orgId),
          inArray(contentItems.status, filmed ? ["idea", "scripting", "filming"] : ["idea", "scripting", "editing"]),
        ),
      );
  }

  let deliverableId = s.deliverableId;
  if (!deliverableId) {
    const [d] = await db
      .insert(deliverables)
      .values({
        orgId,
        clientId: s.clientId,
        projectId: s.projectId,
        shootId: s.shootId,
        title: s.title,
        status: filmed ? "editing" : "to_film",
      })
      .returning({ id: deliverables.id });
    deliverableId = d.id;
  } else {
    await db
      .update(deliverables)
      .set({ status: filmed ? "editing" : "to_film", updatedAt: new Date() })
      .where(
        and(eq(deliverables.id, deliverableId), eq(deliverables.orgId, orgId), eq(deliverables.status, filmed ? "to_film" : "editing")),
      );
  }

  if (contentItemId !== s.contentItemId || deliverableId !== s.deliverableId) {
    await db.update(scripts).set({ contentItemId, deliverableId }).where(eq(scripts.id, s.id));
  }
}

/** Resolve where a new script belongs: a shoot implies its project and client. */
export async function scriptHome(input: { shootId?: string | null; projectId?: string | null }) {
  const user = await requireUser();
  const db = getDb();
  if (input.shootId) {
    const [sh] = await db
      .select({ id: shoots.id, clientId: shoots.clientId, projectId: shoots.projectId })
      .from(shoots)
      .where(and(eq(shoots.id, input.shootId), eq(shoots.orgId, user.orgId)))
      .limit(1);
    if (!sh) throw new Error("That shoot was not found.");
    if (!sh.clientId) throw new Error("Link this shoot to a client first, then add its scripts.");
    return { clientId: sh.clientId, projectId: sh.projectId, shootId: sh.id };
  }
  if (input.projectId) {
    const [p] = await db
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.orgId, user.orgId)))
      .limit(1);
    if (!p) throw new Error("That project was not found.");
    if (!p.clientId) throw new Error("Link this project to a client first, then add its scripts.");
    return { clientId: p.clientId, projectId: p.id, shootId: null };
  }
  throw new Error("Choose a project or a shoot for this script.");
}

export async function archiveScript(id: string) {
  const user = await requireUser();
  await getDb()
    .update(scripts)
    .set({ archivedAt: new Date() })
    .where(and(eq(scripts.id, id), eq(scripts.orgId, user.orgId)));
}

/** Push an approved script into the Content calendar as a planned item. */
export async function pushScriptToContent(id: string): Promise<{ contentItemId: string }> {
  const user = await requireUser();
  const [s] = await getDb()
    .select({
      id: scripts.id,
      clientId: scripts.clientId,
      title: scripts.title,
      body: scripts.body,
      hookScript: scripts.hookScript,
      format: scripts.format,
      contentItemId: scripts.contentItemId,
    })
    .from(scripts)
    .where(and(eq(scripts.id, id), eq(scripts.orgId, user.orgId)))
    .limit(1);
  if (!s) throw new Error("Script not found.");
  if (s.contentItemId) return { contentItemId: s.contentItemId };

  const channel =
    s.format === "tiktok"
      ? "tiktok"
      : s.format === "youtube_short" || s.format === "youtube_long"
        ? "youtube"
        : "instagram";
  const bodyParts = [s.hookScript ? `Hook: ${s.hookScript}` : null, s.body].filter(Boolean);
  const [ci] = await getDb()
    .insert(contentItems)
    .values({
      orgId: user.orgId,
      clientId: s.clientId,
      title: s.title,
      channel: channel as "instagram" | "tiktok" | "youtube" | "linkedin" | "other",
      status: "scripting",
      body: bodyParts.join("\n\n") || null,
    })
    .returning({ id: contentItems.id });
  await getDb()
    .update(scripts)
    .set({ contentItemId: ci.id, status: "approved", updatedAt: new Date() })
    .where(eq(scripts.id, s.id));
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "script.pushed_to_content",
    entityType: "script",
    entityId: s.id,
    meta: { contentItemId: ci.id },
  });
  return { contentItemId: ci.id };
}
