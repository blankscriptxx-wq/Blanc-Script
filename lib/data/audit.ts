import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/data/clients";

/**
 * Audit-log read access. The append-only `activity_log`, org-scoped and newest
 * first, with each actor's name resolved from Neon Auth's `neon_auth."user"`
 * table (a different schema — joined via raw SQL, as in team.ts).
 */

export type ActivityRow = {
  id: string;
  action: string;
  /** Friendly, human-readable description of the action. */
  label: string;
  actorName: string | null;
  entityType: string | null;
  createdAt: Date;
};

/** Map raw action keys to friendly labels. Unknown keys are prettified. */
const ACTION_LABELS: Record<string, string> = {
  "workspace.renamed": "Renamed the workspace",
  "workspace.updated": "Updated workspace details",
  "plan.created": "Created a service package",
  "plan.updated": "Updated a service package",
  "plan.archived": "Removed a service package",
  "addon.created": "Created an add-on",
  "addon.updated": "Updated an add-on",
  "addon.archived": "Removed an add-on",
  "client.created": "Created a client",
};

function labelFor(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Fallback: "entity.did_thing" → "Did thing"
  const verb = action.includes(".") ? action.split(".").slice(1).join(" ") : action;
  const words = verb.replace(/[._]/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : action;
}

type ActivityQueryRow = {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  entityType: string | null;
  createdAt: Date;
};

/** Most recent activity for the caller's org, newest first. */
export async function listRecentActivity(limit = 50): Promise<ActivityRow[]> {
  const user = await requireUser();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const { rows } = await getDb().execute(sql`
    select
      a.id,
      a.action,
      a.entity_type as "entityType",
      a.created_at as "createdAt",
      u.name as "actorName",
      u.email as "actorEmail"
    from activity_log a
    left join neon_auth."user" u on u.id = a.actor_user_id
    where a.org_id = ${user.orgId}
    order by a.created_at desc
    limit ${safeLimit}
  `);
  return (rows as ActivityQueryRow[]).map((r) => ({
    id: r.id,
    action: r.action,
    label: labelFor(r.action),
    actorName: r.actorName ?? r.actorEmail ?? null,
    entityType: r.entityType,
    createdAt: new Date(r.createdAt),
  }));
}
