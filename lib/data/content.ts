import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clients, contentItems, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

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
  notes: string | null;
  createdAt: Date;
};

export async function listContent(): Promise<ContentRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: contentItems.id,
      title: contentItems.title,
      channel: contentItems.channel,
      status: contentItems.status,
      clientId: contentItems.clientId,
      clientName: clients.name,
      scheduledFor: contentItems.scheduledFor,
      notes: contentItems.notes,
      createdAt: contentItems.createdAt,
    })
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
    .select({
      id: contentItems.id,
      title: contentItems.title,
      channel: contentItems.channel,
      status: contentItems.status,
      clientId: contentItems.clientId,
      clientName: clients.name,
      scheduledFor: contentItems.scheduledFor,
      notes: contentItems.notes,
      createdAt: contentItems.createdAt,
    })
    .from(contentItems)
    .leftJoin(clients, eq(contentItems.clientId, clients.id))
    .where(and(eq(contentItems.id, id), eq(contentItems.orgId, user.orgId)))
    .limit(1);
  return (row as ContentRow | undefined) ?? null;
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
