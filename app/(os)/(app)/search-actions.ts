"use server";

import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  clients,
  contentItems,
  deliverables,
  invoices,
  projects,
  shoots,
  talent,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type SearchHit = {
  id: string;
  kind: "client" | "project" | "shoot" | "deliverable" | "content" | "invoice" | "talent";
  label: string;
  href: string;
};

const PER_KIND = 4;

/**
 * Workspace search for the command palette. Org-scoped; finance results only
 * for people who can see money. Returns a small, mixed list of record links.
 */
export async function searchWorkspaceAction(query: string): Promise<SearchHit[]> {
  try {
    const q = query.trim().slice(0, 80);
    if (q.length < 2) return [];
    const user = await requireUser();
    const org = user.orgId;
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const db = getDb();

    const [cl, pr, sh, de, co, ta, inv] = await Promise.all([
      db.select({ id: clients.id, label: clients.name }).from(clients)
        .where(and(eq(clients.orgId, org), isNull(clients.archivedAt), ilike(clients.name, like))).limit(PER_KIND),
      db.select({ id: projects.id, label: projects.name }).from(projects)
        .where(and(eq(projects.orgId, org), isNull(projects.archivedAt), ilike(projects.name, like))).limit(PER_KIND),
      db.select({ id: shoots.id, label: shoots.title }).from(shoots)
        .where(and(eq(shoots.orgId, org), isNull(shoots.archivedAt), ilike(shoots.title, like))).limit(PER_KIND),
      db.select({ id: deliverables.id, label: deliverables.title }).from(deliverables)
        .where(and(eq(deliverables.orgId, org), isNull(deliverables.archivedAt), ilike(deliverables.title, like))).limit(PER_KIND),
      db.select({ id: contentItems.id, label: contentItems.title }).from(contentItems)
        .where(and(eq(contentItems.orgId, org), isNull(contentItems.archivedAt), ilike(contentItems.title, like))).limit(PER_KIND),
      db.select({ id: talent.id, label: talent.name }).from(talent)
        .where(and(eq(talent.orgId, org), isNull(talent.archivedAt), ilike(talent.name, like))).limit(PER_KIND),
      user.capabilities.has("can_see_money")
        ? db.select({ id: invoices.id, label: invoices.number }).from(invoices)
            .where(and(eq(invoices.orgId, org), isNull(invoices.archivedAt), or(ilike(invoices.number, like), ilike(invoices.reference, like)))).limit(PER_KIND)
        : Promise.resolve([] as { id: string; label: string | null }[]),
    ]);

    const hit = (kind: SearchHit["kind"], href: (id: string) => string) =>
      (r: { id: string; label: string | null }): SearchHit => ({
        id: r.id,
        kind,
        label: r.label ?? "Untitled",
        href: href(r.id),
      });

    return [
      ...cl.map(hit("client", (id) => `/clients/${id}`)),
      ...pr.map(hit("project", (id) => `/projects/${id}`)),
      ...de.map(hit("deliverable", (id) => `/edits/${id}`)),
      ...inv.map(hit("invoice", (id) => `/finance/${id}`)),
      ...ta.map(hit("talent", (id) => `/talent/${id}`)),
      ...sh.map(hit("shoot", () => `/shoots`)),
      ...co.map(hit("content", () => `/content`)),
    ];
  } catch {
    return [];
  }
}
