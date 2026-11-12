import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clients, mediaAssets, projects, shoots } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import {
  deleteObject,
  presignGetUrl,
  presignPutUrl,
  storageConfigured,
} from "@/lib/storage/r2";

export { storageConfigured };

export type MediaKind = "video" | "image" | "document" | "audio" | "other";
export type MediaStatus = "pending" | "uploaded" | "ready" | "failed";

export type MediaAssetRow = {
  id: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: MediaStatus;
  shootId: string | null;
  projectId: string | null;
  clientId: string | null;
  deliverableId: string | null;
  contentItemId: string | null;
  createdAt: Date;
};

export function kindFromMime(mime: string | null | undefined): MediaKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (
    m === "application/pdf" ||
    m.includes("word") ||
    m.includes("sheet") ||
    m.includes("excel") ||
    m.startsWith("text/")
  )
    return "document";
  return "other";
}

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
}

const linkInput = z.object({
  shootId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  deliverableId: z.string().uuid().nullable().optional(),
  contentItemId: z.string().uuid().nullable().optional(),
  scriptId: z.string().uuid().nullable().optional(),
});

const uploadTargetInput = linkInput.extend({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(255).nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
});
export type UploadTargetInput = z.input<typeof uploadTargetInput>;

/**
 * Register a pending asset and hand back a presigned PUT URL for the browser to
 * upload directly to R2. The chosen shoot/project/etc. is stored now, so the file
 * is auto-assigned the moment it lands.
 */
export async function createUploadTarget(raw: UploadTargetInput): Promise<{
  assetId: string;
  uploadUrl: string;
  storageKey: string;
}> {
  const user = await requireUser();
  if (!storageConfigured()) {
    throw new Error(
      "Storage isn't connected yet. Add the Cloudflare R2 keys in Settings → Integrations, then uploads will turn on.",
    );
  }
  const data = uploadTargetInput.parse(raw);
  const storageKey = `org/${user.orgId}/${new Date().getUTCFullYear()}/${randomUUID()}__${safeName(
    data.fileName,
  )}`;
  const contentType = data.mimeType ?? "application/octet-stream";

  const [row] = await getDb()
    .insert(mediaAssets)
    .values({
      orgId: user.orgId,
      uploaderUserId: user.id,
      kind: kindFromMime(data.mimeType),
      fileName: data.fileName,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      storageProvider: "r2",
      storageKey,
      status: "pending",
      shootId: data.shootId ?? null,
      projectId: data.projectId ?? null,
      clientId: data.clientId ?? null,
      deliverableId: data.deliverableId ?? null,
      contentItemId: data.contentItemId ?? null,
      scriptId: data.scriptId ?? null,
    })
    .returning({ id: mediaAssets.id });

  const uploadUrl = await presignPutUrl(storageKey, contentType);
  return { assetId: row.id, uploadUrl, storageKey };
}

/** Mark the asset ready once the browser's PUT succeeds. */
export async function confirmUpload(assetId: string): Promise<void> {
  const user = await requireUser();
  await getDb()
    .update(mediaAssets)
    .set({ status: "ready", updatedAt: new Date() })
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orgId, user.orgId)));
}

export type MediaFilter = Partial<
  Record<
    "shootId" | "projectId" | "clientId" | "deliverableId" | "contentItemId" | "scriptId",
    string
  >
>;

export async function listMediaFor(filter: MediaFilter): Promise<MediaAssetRow[]> {
  const user = await requireUser();
  const conds = [eq(mediaAssets.orgId, user.orgId)];
  if (filter.shootId) conds.push(eq(mediaAssets.shootId, filter.shootId));
  if (filter.projectId) conds.push(eq(mediaAssets.projectId, filter.projectId));
  if (filter.clientId) conds.push(eq(mediaAssets.clientId, filter.clientId));
  if (filter.deliverableId) conds.push(eq(mediaAssets.deliverableId, filter.deliverableId));
  if (filter.contentItemId) conds.push(eq(mediaAssets.contentItemId, filter.contentItemId));
  if (filter.scriptId) conds.push(eq(mediaAssets.scriptId, filter.scriptId));
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
    .where(and(...conds))
    .orderBy(desc(mediaAssets.createdAt));
  return rows as MediaAssetRow[];
}

/** All media across the org that is attached to any shoot (for the Shoots drawer). */
export async function listMediaWithShoot(): Promise<MediaAssetRow[]> {
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
    .where(and(eq(mediaAssets.orgId, user.orgId), isNotNull(mediaAssets.shootId)))
    .orderBy(desc(mediaAssets.createdAt));
  return rows as MediaAssetRow[];
}

export type ScriptMediaRow = MediaAssetRow & { scriptId: string | null };

/** All media attached to any script in the org (for the Script studio). */
export async function listAllScriptMedia(): Promise<ScriptMediaRow[]> {
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
      scriptId: mediaAssets.scriptId,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.orgId, user.orgId), isNotNull(mediaAssets.scriptId)))
    .orderBy(desc(mediaAssets.createdAt));
  return rows as ScriptMediaRow[];
}

/** Presigned download/view URL for an asset the caller owns. */
export async function getDownloadUrl(assetId: string): Promise<string | null> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({ storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orgId, user.orgId)))
    .limit(1);
  if (!row || !storageConfigured()) return null;
  return presignGetUrl(row.storageKey);
}

export async function removeMedia(assetId: string): Promise<void> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({ storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orgId, user.orgId)))
    .limit(1);
  if (!row) return;
  if (storageConfigured()) {
    try {
      await deleteObject(row.storageKey);
    } catch {
      // best-effort; the row removal is what matters for the UI
    }
  }
  await getDb()
    .delete(mediaAssets)
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orgId, user.orgId)));
}

export async function assignMedia(assetId: string, links: MediaFilter): Promise<void> {
  const user = await requireUser();
  await getDb()
    .update(mediaAssets)
    .set({
      shootId: links.shootId ?? null,
      projectId: links.projectId ?? null,
      clientId: links.clientId ?? null,
      deliverableId: links.deliverableId ?? null,
      contentItemId: links.contentItemId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orgId, user.orgId)));
}

/** Options for the uploader's "assign to…" pickers. */
export async function listUploadTargets() {
  const user = await requireUser();
  const db = getDb();
  const [sh, pr, cl] = await Promise.all([
    db
      .select({ id: shoots.id, name: shoots.title })
      .from(shoots)
      .where(and(eq(shoots.orgId, user.orgId), isNull(shoots.archivedAt)))
      .orderBy(desc(shoots.scheduledAt)),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.orgId, user.orgId), isNull(projects.archivedAt)))
      .orderBy(asc(projects.name)),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.orgId, user.orgId), isNull(clients.archivedAt)))
      .orderBy(asc(clients.name)),
  ]);
  return { shoots: sh, projects: pr, clients: cl };
}
