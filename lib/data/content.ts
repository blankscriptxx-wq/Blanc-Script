import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clients, contentItems, mediaAssets, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import type { MediaAssetRow } from "@/lib/data/media";

/**
 * Content calendar data access. EVERY query is scoped to the caller's org_id —
 * tenancy is enforced here (application layer) and, as defence in depth, by Neon RLS.
 */

export type ContentChannel =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "other";
export type ContentStatus =
  | "idea"
  | "scripting"
  | "filming"
  | "editing"
  | "scheduled"
  | "posted";

export type ContentRow = {
  id: string;
  title: string;
  channel: ContentChannel;
  status: ContentStatus;
  clientId: string | null;
  clientName: string | null;
  scheduledFor: Date | null;
  body: string | null;
  hashtags: string | null;
  link: string | null;
  notes: string | null;
  createdAt: Date;
};

const contentColumns = {
  id: contentItems.id,
  title: contentItems.title,
  channel: contentItems.channel,
  status: contentItems.status,
  clientId: contentItems.clientId,
  clientName: clients.name,
  scheduledFor: contentItems.scheduledFor,
  body: contentItems.body,
  hashtags: contentItems.hashtags,
  link: contentItems.link,
  notes: contentItems.notes,
  createdAt: contentItems.createdAt,
} as const;

export async function listContent(): Promise<ContentRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select(contentColumns)
    .from(contentItems)
    .leftJoin(clients, eq(contentItems.clientId, clients.id))
    .where(and(eq(contentItems.orgId, user.orgId), isNull(contentItems.archivedAt)))
    .orderBy(
      sql`${contentItems.scheduledFor} asc nulls last`,
      desc(contentItems.createdAt),
    );
  return rows as ContentRow[];
}

export async function getContentItem(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select(contentColumns)
    .from(contentItems)
    .leftJoin(clients, eq(contentItems.clientId, clients.id))
    .where(and(eq(contentItems.id, id), eq(contentItems.orgId, user.orgId)))
    .limit(1);
  return (row as ContentRow | undefined) ?? null;
}

/** All media across the org that is attached to any content item (for the Content drawer). */
export async function listContentMedia(): Promise<MediaAssetRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: mediaAssets.id,
      kind: mediaAssets.kind,
      fileName: mediaAssets.fileName,
      mimeType: mediaAssets.mimeType,
      sizeBytes: mediaAssets.sizeBytes,
      status: mediaAssets.status,
      shootId: mediaAssets.shootId,
      projectId: mediaAssets.projectId,
      clientId: mediaAssets.clientId,
      deliverableId: mediaAssets.deliverableId,
      contentItemId: mediaAssets.contentItemId,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.orgId, user.orgId), isNotNull(mediaAssets.contentItemId)))
    .orderBy(desc(mediaAssets.createdAt));
  return rows as MediaAssetRow[];
}

export async function listClientOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
    .orderBy(asc(clients.name));
}

export const contentInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  clientId: z.string().uuid().nullable().optional(),
  channel: z
    .enum(["instagram", "tiktok", "youtube", "linkedin", "other"])
    .default("instagram"),
  status: z
    .enum(["idea", "scripting", "filming", "editing", "scheduled", "posted"])
    .default("idea"),
  scheduledFor: z.date().nullable().optional(),
});
export type ContentInput = z.infer<typeof contentInput>;

export async function createContentItem(input: ContentInput) {
  const user = await requireUser();
  const data = contentInput.parse(input);
  const [row] = await getDb()
    .insert(contentItems)
    .values({
      orgId: user.orgId,
      title: data.title,
      clientId: data.clientId ?? null,
      channel: data.channel,
      status: data.status,
      scheduledFor: data.scheduledFor ?? null,
    })
    .returning({ id: contentItems.id });
  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "content.created",
    entityType: "content_item",
    entityId: row.id,
    meta: { title: data.title, channel: data.channel },
  });
  return row;
}

export const updateContentInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  clientId: z.string().uuid().nullable().optional(),
  channel: z
    .enum(["instagram", "tiktok", "youtube", "linkedin", "other"])
    .optional(),
  status: z
    .enum(["idea", "scripting", "filming", "editing", "scheduled", "posted"])
    .optional(),
  scheduledFor: z.date().nullable().optional(),
  body: z.string().max(5000).nullable().optional(),
  hashtags: z.string().max(1000).nullable().optional(),
  link: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});
export type UpdateContentInput = z.infer<typeof updateContentInput>;

export async function updateContentItem(id: string, raw: UpdateContentInput) {
  const user = await requireUser();
  const data = updateContentInput.parse(raw);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.clientId !== undefined) patch.clientId = data.clientId;
  if (data.channel !== undefined) patch.channel = data.channel;
  if (data.status !== undefined) patch.status = data.status;
  if (data.scheduledFor !== undefined) patch.scheduledFor = data.scheduledFor;
  if (data.body !== undefined) patch.body = data.body;
  if (data.hashtags !== undefined) patch.hashtags = data.hashtags;
  if (data.link !== undefined) patch.link = data.link;
  if (data.notes !== undefined) patch.notes = data.notes;

  const db = getDb();
  // Org-scope + ownership guard: the update only matches rows in the caller's org.
  const [row] = await db
    .update(contentItems)
    .set(patch)
    .where(and(eq(contentItems.id, id), eq(contentItems.orgId, user.orgId)))
    .returning({ id: contentItems.id, title: contentItems.title });
  if (!row) throw new Error("Content item not found.");
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "content.updated",
    entityType: "content_item",
    entityId: row.id,
    meta: { title: row.title },
  });
  return { id: row.id };
}
