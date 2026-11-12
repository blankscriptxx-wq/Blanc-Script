import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, mediaAssets, portalLinks, scripts, shoots } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { kindFromMime } from "@/lib/data/media";
import { presignPutUrl, storageConfigured } from "@/lib/storage/r2";
import type { PortalContext } from "@/lib/data/portal";

/**
 * Footage and files a client sends through their portal. Files go straight
 * from the client's browser to storage; each lands against the client,
 * unassigned, for staff to file under a shoot or a script.
 */

const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";

/** A single upload is one request to storage, which caps it at 5 GB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

const uploadInput = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(255).nullable(),
  sizeBytes: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES, "That file is over 5 GB. Please send it another way."),
  note: z.string().trim().max(1000).nullable(),
});

// ── Portal side ───────────────────────────────────────────────────────────

export async function createPortalUpload(ctx: PortalContext, raw: z.input<typeof uploadInput>) {
  if (!storageConfigured()) throw new Error("Uploads aren't available right now. Please try again later.");
  const data = uploadInput.parse(raw);
  const storageKey = `org/${ctx.orgId}/client-uploads/${ctx.clientId}/${new Date().getUTCFullYear()}/${randomUUID()}__${safeName(data.fileName)}`;
  const [row] = await getDb()
    .insert(mediaAssets)
    .values({
      orgId: ctx.orgId,
      kind: kindFromMime(data.mimeType),
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      storageProvider: "r2",
      storageKey,
      status: "pending",
      clientId: ctx.clientId,
      portalLinkId: ctx.linkId,
      note: data.note,
    })
    .returning({ id: mediaAssets.id });
  const uploadUrl = await presignPutUrl(storageKey, data.mimeType ?? "application/octet-stream");
  return { assetId: row.id, uploadUrl };
}

export async function confirmPortalUpload(ctx: PortalContext, assetId: string) {
  const [row] = await getDb()
    .update(mediaAssets)
    .set({ status: "ready", updatedAt: new Date() })
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.orgId, ctx.orgId),
        eq(mediaAssets.clientId, ctx.clientId),
        eq(mediaAssets.portalLinkId, ctx.linkId),
      ),
    )
    .returning({ id: mediaAssets.id, fileName: mediaAssets.fileName });
  if (!row) return;
  await getDb().insert(activityLog).values({
    orgId: ctx.orgId,
    actorUserId: null,
    action: "client.file_uploaded",
    entityType: "client",
    entityId: ctx.clientId,
    meta: { fileName: row.fileName, by: ctx.viewerName, via: "portal" },
  });
}

export type PortalUpload = { id: string; fileName: string; sizeBytes: number | null; createdAt: Date };

/** What this client has sent (anyone on the client's portal sees the list). */
export async function listPortalUploads(ctx: PortalContext): Promise<PortalUpload[]> {
  return getDb()
    .select({
      id: mediaAssets.id,
      fileName: mediaAssets.fileName,
      sizeBytes: mediaAssets.sizeBytes,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.orgId, ctx.orgId),
        eq(mediaAssets.clientId, ctx.clientId),
        isNotNull(mediaAssets.portalLinkId),
        eq(mediaAssets.status, "ready"),
      ),
    )
    .orderBy(desc(mediaAssets.createdAt))
    .limit(50);
}

// ── Staff side ────────────────────────────────────────────────────────────

export type ClientUploadRow = {
  id: string;
  fileName: string;
  kind: string;
  sizeBytes: number | null;
  note: string | null;
  uploadedBy: string | null;
  shootId: string | null;
  shootTitle: string | null;
  scriptId: string | null;
  scriptTitle: string | null;
  createdAt: Date;
};

export async function listClientUploads(clientId: string): Promise<ClientUploadRow[]> {
  const user = await requireUser();
  return getDb()
    .select({
      id: mediaAssets.id,
      fileName: mediaAssets.fileName,
      kind: mediaAssets.kind,
      sizeBytes: mediaAssets.sizeBytes,
      note: mediaAssets.note,
      uploadedBy: portalLinks.label,
      shootId: mediaAssets.shootId,
      shootTitle: shoots.title,
      scriptId: mediaAssets.scriptId,
      scriptTitle: scripts.title,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .leftJoin(portalLinks, eq(mediaAssets.portalLinkId, portalLinks.id))
    .leftJoin(shoots, eq(mediaAssets.shootId, shoots.id))
    .leftJoin(scripts, eq(mediaAssets.scriptId, scripts.id))
    .where(
      and(
        eq(mediaAssets.orgId, user.orgId),
        eq(mediaAssets.clientId, clientId),
        isNotNull(mediaAssets.portalLinkId),
        ne(mediaAssets.status, "pending"),
      ),
    )
    .orderBy(desc(mediaAssets.createdAt));
}

/** Where a client's upload can be filed: this client's shoots and scripts. */
export async function uploadAssignOptions(clientId: string) {
  const user = await requireUser();
  const db = getDb();
  const [shootRows, scriptRows] = await Promise.all([
    db
      .select({ id: shoots.id, title: shoots.title })
      .from(shoots)
      .where(and(eq(shoots.orgId, user.orgId), eq(shoots.clientId, clientId), sql`${shoots.archivedAt} is null`))
      .orderBy(desc(shoots.scheduledAt)),
    db
      .select({ id: scripts.id, title: scripts.title })
      .from(scripts)
      .where(and(eq(scripts.orgId, user.orgId), eq(scripts.clientId, clientId)))
      .orderBy(desc(scripts.createdAt)),
  ]);
  return { shoots: shootRows, scripts: scriptRows };
}

/** File a client upload under a shoot or a script (or clear it with neither). */
export async function assignClientUpload(assetId: string, target: { shootId?: string | null; scriptId?: string | null }) {
  const user = await requireUser();
  const db = getDb();
  const [asset] = await db
    .select({ id: mediaAssets.id, clientId: mediaAssets.clientId })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orgId, user.orgId), isNotNull(mediaAssets.portalLinkId)))
    .limit(1);
  if (!asset?.clientId) throw new Error("That upload was not found.");
  // The target must belong to the same client in this workspace.
  if (target.shootId) {
    const [ok] = await db
      .select({ id: shoots.id })
      .from(shoots)
      .where(and(eq(shoots.id, target.shootId), eq(shoots.orgId, user.orgId), eq(shoots.clientId, asset.clientId)))
      .limit(1);
    if (!ok) throw new Error("That shoot isn't one of this client's.");
  }
  if (target.scriptId) {
    const [ok] = await db
      .select({ id: scripts.id })
      .from(scripts)
      .where(and(eq(scripts.id, target.scriptId), eq(scripts.orgId, user.orgId), eq(scripts.clientId, asset.clientId)))
      .limit(1);
    if (!ok) throw new Error("That script isn't one of this client's.");
  }
  await db
    .update(mediaAssets)
    .set({ shootId: target.shootId ?? null, scriptId: target.scriptId ?? null, updatedAt: new Date() })
    .where(eq(mediaAssets.id, asset.id));
}
