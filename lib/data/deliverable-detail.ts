import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  deliverables,
  deliverableVersions,
  reviewComments,
  projects,
  clients,
  shoots,
  activityLog,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import type { DeliverableStatus } from "@/lib/data/edits";

/**
 * Deliverable detail + review workflow data access. EVERY query is scoped to the
 * caller's org_id — tenancy is enforced here (application layer) and, as defence
 * in depth, by Neon RLS. Mutations additionally guard that the deliverable
 * belongs to the caller's org before writing.
 */

export type DeliverableVersionRow = {
  id: string;
  label: string;
  previewUrl: string | null;
  note: string | null;
  createdAt: Date;
};

export type ReviewCommentRow = {
  id: string;
  body: string;
  authorUserId: string | null;
  authorName: string | null;
  parentId: string | null;
  timecodeSeconds: number | null;
  resolvedAt: Date | null;
  createdAt: Date;
};

export type DeliverableDetailHeader = {
  id: string;
  title: string;
  status: DeliverableStatus;
  versionLabel: string | null;
  previewUrl: string | null;
  notes: string | null;
  dueAt: Date | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  shootId: string | null;
  shootTitle: string | null;
  reviewerUserId: string | null;
  reviewerName: string | null;
  reviewDueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliverableDetail = {
  deliverable: DeliverableDetailHeader;
  versions: DeliverableVersionRow[];
  comments: ReviewCommentRow[];
};

/** Confirm the deliverable exists and belongs to the caller's org; returns its id or null. */
async function assertDeliverableInOrg(id: string, orgId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: deliverables.id })
    .from(deliverables)
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, orgId)))
    .limit(1);
  return row?.id ?? null;
}

export async function getDeliverableDetail(id: string): Promise<DeliverableDetail | null> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();

  const [deliverable] = await db
    .select({
      id: deliverables.id,
      title: deliverables.title,
      status: deliverables.status,
      versionLabel: deliverables.versionLabel,
      previewUrl: deliverables.previewUrl,
      notes: deliverables.notes,
      dueAt: deliverables.dueAt,
      projectId: deliverables.projectId,
      projectName: projects.name,
      clientId: deliverables.clientId,
      clientName: clients.name,
      shootId: deliverables.shootId,
      shootTitle: shoots.title,
      reviewerUserId: deliverables.reviewerUserId,
      reviewDueAt: deliverables.reviewDueAt,
      createdAt: deliverables.createdAt,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .leftJoin(projects, eq(deliverables.projectId, projects.id))
    .leftJoin(clients, eq(deliverables.clientId, clients.id))
    .leftJoin(shoots, eq(deliverables.shootId, shoots.id))
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, org)))
    .limit(1);

  if (!deliverable) return null;

  const [versions, commentRows, reviewerRows] = await Promise.all([
    db
      .select({
        id: deliverableVersions.id,
        label: deliverableVersions.label,
        previewUrl: deliverableVersions.previewUrl,
        note: deliverableVersions.note,
        createdAt: deliverableVersions.createdAt,
      })
      .from(deliverableVersions)
      .where(
        and(
          eq(deliverableVersions.deliverableId, id),
          eq(deliverableVersions.orgId, org),
        ),
      )
      .orderBy(desc(deliverableVersions.createdAt)),
    // Resolve authorUserId → name via a left join to Neon Auth's user table
    // (a different schema, outside our Drizzle model — joined via raw SQL).
    db.execute(sql`
      select
        rc.id as "id",
        rc.body as "body",
        rc.author_user_id as "authorUserId",
        u.name as "authorName",
        rc.parent_id as "parentId",
        rc.timecode_seconds as "timecodeSeconds",
        rc.resolved_at as "resolvedAt",
        rc.created_at as "createdAt"
      from review_comments rc
      left join neon_auth."user" u on u.id = rc.author_user_id
      where rc.deliverable_id = ${id} and rc.org_id = ${org}
      order by rc.created_at asc
    `),
    // Resolve the reviewer's user_id → name (Neon Auth table, raw SQL).
    deliverable.reviewerUserId
      ? db.execute(sql`
          select name as "name" from neon_auth."user"
          where id = ${deliverable.reviewerUserId} limit 1
        `)
      : Promise.resolve({ rows: [] as { name: string | null }[] }),
  ]);

  const reviewerName =
    (reviewerRows.rows[0] as { name: string | null } | undefined)?.name ?? null;

  return {
    deliverable: { ...deliverable, reviewerName } as DeliverableDetailHeader,
    versions: versions as DeliverableVersionRow[],
    comments: (commentRows.rows as unknown as ReviewCommentRow[]).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
    })),
  };
}

const addVersionInput = z.object({
  deliverableId: z.string().uuid(),
  label: z.string().trim().min(1, "Version label is required").max(40),
  previewUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(2000)
    .nullable()
    .optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});
export type AddVersionInput = z.infer<typeof addVersionInput>;

export async function addVersion(input: AddVersionInput) {
  const user = await requireUser();
  const data = addVersionInput.parse(input);
  const owned = await assertDeliverableInOrg(data.deliverableId, user.orgId);
  if (!owned) throw new Error("Deliverable not found.");

  const [row] = await getDb()
    .insert(deliverableVersions)
    .values({
      orgId: user.orgId,
      deliverableId: data.deliverableId,
      label: data.label,
      previewUrl: data.previewUrl ?? null,
      note: data.note ?? null,
    })
    .returning({ id: deliverableVersions.id });

  // Keep the deliverable's headline version label + preview in step with the newest cut.
  await getDb()
    .update(deliverables)
    .set({
      versionLabel: data.label,
      previewUrl: data.previewUrl ?? undefined,
      updatedAt: new Date(),
    })
    .where(
      and(eq(deliverables.id, data.deliverableId), eq(deliverables.orgId, user.orgId)),
    );

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.version_added",
    entityType: "deliverable",
    entityId: data.deliverableId,
    meta: { label: data.label },
  });
  return row;
}

const addReviewCommentInput = z.object({
  deliverableId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a comment first").max(4000),
  /** When set, this comment is a reply to another comment on the deliverable. */
  parentId: z.string().uuid().nullable().optional(),
  /** Optional video timecode (seconds) to anchor the note to a frame. */
  timecodeSeconds: z.coerce.number().int().min(0).max(360000).nullable().optional(),
});
export type AddReviewCommentInput = z.infer<typeof addReviewCommentInput>;

export async function addReviewComment(input: AddReviewCommentInput) {
  const user = await requireUser();
  const data = addReviewCommentInput.parse(input);
  const owned = await assertDeliverableInOrg(data.deliverableId, user.orgId);
  if (!owned) throw new Error("Deliverable not found.");

  // If replying, confirm the parent belongs to the same deliverable + org.
  if (data.parentId) {
    const [parent] = await getDb()
      .select({ id: reviewComments.id })
      .from(reviewComments)
      .where(
        and(
          eq(reviewComments.id, data.parentId),
          eq(reviewComments.deliverableId, data.deliverableId),
          eq(reviewComments.orgId, user.orgId),
        ),
      )
      .limit(1);
    if (!parent) throw new Error("Parent comment not found.");
  }

  const [row] = await getDb()
    .insert(reviewComments)
    .values({
      orgId: user.orgId,
      deliverableId: data.deliverableId,
      authorUserId: user.id,
      body: data.body,
      parentId: data.parentId ?? null,
      timecodeSeconds: data.timecodeSeconds ?? null,
    })
    .returning({ id: reviewComments.id });

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: data.parentId ? "deliverable.comment_replied" : "deliverable.commented",
    entityType: "deliverable",
    entityId: data.deliverableId,
    meta: {},
  });
  return row;
}

/** Confirm a comment belongs to the caller's org; returns its deliverableId or null. */
async function assertCommentInOrg(
  id: string,
  orgId: string,
): Promise<string | null> {
  const [row] = await getDb()
    .select({ deliverableId: reviewComments.deliverableId })
    .from(reviewComments)
    .where(and(eq(reviewComments.id, id), eq(reviewComments.orgId, orgId)))
    .limit(1);
  return row?.deliverableId ?? null;
}

export async function resolveComment(id: string) {
  const user = await requireUser();
  const deliverableId = await assertCommentInOrg(id, user.orgId);
  if (!deliverableId) throw new Error("Comment not found.");

  await getDb()
    .update(reviewComments)
    .set({ resolvedAt: new Date() })
    .where(and(eq(reviewComments.id, id), eq(reviewComments.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.comment_resolved",
    entityType: "deliverable",
    entityId: deliverableId,
    meta: { commentId: id },
  });
  return { deliverableId };
}

export async function unresolveComment(id: string) {
  const user = await requireUser();
  const deliverableId = await assertCommentInOrg(id, user.orgId);
  if (!deliverableId) throw new Error("Comment not found.");

  await getDb()
    .update(reviewComments)
    .set({ resolvedAt: null })
    .where(and(eq(reviewComments.id, id), eq(reviewComments.orgId, user.orgId)));

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.comment_reopened",
    entityType: "deliverable",
    entityId: deliverableId,
    meta: { commentId: id },
  });
  return { deliverableId };
}

const setStatusInput = z.object({
  deliverableId: z.string().uuid(),
  status: z.enum([
    "editing",
    "in_review",
    "changes_requested",
    "approved",
    "published",
  ]),
});

export async function setDeliverableStatus(
  deliverableId: string,
  status: DeliverableStatus,
) {
  const user = await requireUser();
  const data = setStatusInput.parse({ deliverableId, status });
  const owned = await assertDeliverableInOrg(data.deliverableId, user.orgId);
  if (!owned) throw new Error("Deliverable not found.");

  await getDb()
    .update(deliverables)
    .set({ status: data.status, updatedAt: new Date() })
    .where(
      and(eq(deliverables.id, data.deliverableId), eq(deliverables.orgId, user.orgId)),
    );

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.status_changed",
    entityType: "deliverable",
    entityId: data.deliverableId,
    meta: { status: data.status },
  });
}
