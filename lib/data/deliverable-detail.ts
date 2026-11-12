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
  projectName: string | null;
  clientName: string | null;
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
      projectName: projects.name,
      clientName: clients.name,
      createdAt: deliverables.createdAt,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .leftJoin(projects, eq(deliverables.projectId, projects.id))
    .leftJoin(clients, eq(deliverables.clientId, clients.id))
    .where(and(eq(deliverables.id, id), eq(deliverables.orgId, org)))
    .limit(1);

  if (!deliverable) return null;

  const [versions, commentRows] = await Promise.all([
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
        rc.created_at as "createdAt"
      from review_comments rc
      left join neon_auth."user" u on u.id = rc.author_user_id
      where rc.deliverable_id = ${id} and rc.org_id = ${org}
      order by rc.created_at desc
    `),
  ]);

  return {
    deliverable: deliverable as DeliverableDetailHeader,
    versions: versions as DeliverableVersionRow[],
    comments: (commentRows.rows as unknown as ReviewCommentRow[]).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
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
});
export type AddReviewCommentInput = z.infer<typeof addReviewCommentInput>;

export async function addReviewComment(input: AddReviewCommentInput) {
  const user = await requireUser();
  const data = addReviewCommentInput.parse(input);
  const owned = await assertDeliverableInOrg(data.deliverableId, user.orgId);
  if (!owned) throw new Error("Deliverable not found.");

  const [row] = await getDb()
    .insert(reviewComments)
    .values({
      orgId: user.orgId,
      deliverableId: data.deliverableId,
      authorUserId: user.id,
      body: data.body,
    })
    .returning({ id: reviewComments.id });

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "deliverable.commented",
    entityType: "deliverable",
    entityId: data.deliverableId,
    meta: {},
  });
  return row;
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
