import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, organisations } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
};

export async function getWorkspace(): Promise<Workspace | null> {
  const user = await requireUser();
  const db = getDb();
  const [row] = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
    })
    .from(organisations)
    .where(eq(organisations.id, user.orgId))
    .limit(1);
  return row ?? null;
}

const workspaceNameInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
});

/** Rename the workspace. Gated: caller must hold `can_settings`. */
export async function updateWorkspaceName(raw: unknown): Promise<Workspace> {
  const user = await requireUser();
  if (!user.capabilities.has("can_settings")) {
    throw new Error("You do not have permission to change workspace settings.");
  }
  const { name } = workspaceNameInput.parse(raw);
  const db = getDb();
  const [row] = await db
    .update(organisations)
    .set({ name, updatedAt: new Date() })
    .where(eq(organisations.id, user.orgId))
    .returning({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
    });
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "workspace.renamed",
    entityType: "organisation",
    entityId: user.orgId,
    meta: { name },
  });
  return row;
}
