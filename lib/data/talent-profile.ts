import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  clients,
  contentItems,
  contentTalent,
  invoices,
  projects,
  projectTalent,
  shoots,
  shootTalent,
  talent,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import type { CastingStatus } from "@/lib/data/castings";
import type { InvoiceStatus } from "@/lib/data/finance";

export type TalentProfileShoot = {
  id: string;
  title: string;
  scheduledAt: Date | null;
  roleName: string | null;
  status: CastingStatus;
  effectiveRatePence: number | null;
  rateIsOverride: boolean;
};
export type TalentProfileProject = {
  id: string;
  name: string;
  roleName: string | null;
  effectiveRatePence: number | null;
  rateIsOverride: boolean;
};
export type TalentProfileContent = {
  id: string;
  title: string;
  roleName: string | null;
};
export type TalentProfileInvoice = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  amountPence: number;
  dueAt: Date | null;
  paidAt: Date | null;
  clientName: string | null;
};

export type TalentClientGroup = {
  clientId: string | null;
  clientName: string | null;
  shoots: TalentProfileShoot[];
  projects: TalentProfileProject[];
  content: TalentProfileContent[];
  clientInvoices: TalentProfileInvoice[];
};

export type TalentProfile = {
  talent: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: "active" | "inactive" | "archived";
    ratePerHourPence: number | null;
    notes: string | null;
    createdAt: Date;
  };
  summary: {
    shootsCount: number;
    clientsCount: number;
    totalBookedPence: number;
    paidPence: number;
    outstandingPence: number;
  };
  payments: TalentProfileInvoice[];
  byClient: TalentClientGroup[];
};

export async function getTalentProfile(id: string): Promise<TalentProfile | null> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();

  const [t] = await db
    .select({
      id: talent.id,
      name: talent.name,
      email: talent.email,
      phone: talent.phone,
      status: talent.status,
      ratePerHourPence: talent.ratePerHourPence,
      notes: talent.notes,
      createdAt: talent.createdAt,
    })
    .from(talent)
    .where(and(eq(talent.id, id), eq(talent.orgId, org)))
    .limit(1);
  if (!t) return null;

  const rate = t.ratePerHourPence;
  const eff = (agreed: number | null): { effectiveRatePence: number | null; rateIsOverride: boolean } => ({
    effectiveRatePence: agreed ?? rate,
    rateIsOverride: agreed != null,
  });

  const [shootRows, projectRows, contentRows, paymentRows] = await Promise.all([
    db
      .select({
        id: shoots.id,
        title: shoots.title,
        scheduledAt: shoots.scheduledAt,
        clientId: shoots.clientId,
        clientName: clients.name,
        roleName: shootTalent.roleName,
        status: shootTalent.status,
        agreedRatePence: shootTalent.agreedRatePence,
      })
      .from(shootTalent)
      .innerJoin(shoots, eq(shootTalent.shootId, shoots.id))
      .leftJoin(clients, eq(shoots.clientId, clients.id))
      .where(and(eq(shootTalent.orgId, org), eq(shootTalent.talentId, id)))
      .orderBy(desc(shoots.scheduledAt)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
        clientName: clients.name,
        roleName: projectTalent.roleName,
        agreedRatePence: projectTalent.agreedRatePence,
      })
      .from(projectTalent)
      .innerJoin(projects, eq(projectTalent.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(eq(projectTalent.orgId, org), eq(projectTalent.talentId, id))),
    db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        clientId: contentItems.clientId,
        clientName: clients.name,
        roleName: contentTalent.roleName,
      })
      .from(contentTalent)
      .innerJoin(contentItems, eq(contentTalent.contentItemId, contentItems.id))
      .leftJoin(clients, eq(contentItems.clientId, clients.id))
      .where(and(eq(contentTalent.orgId, org), eq(contentTalent.talentId, id))),
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        amountPence: invoices.amountPence,
        dueAt: invoices.dueAt,
        paidAt: invoices.paidAt,
        clientName: clients.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.orgId, org),
          eq(invoices.talentId, id),
          isNull(invoices.archivedAt),
        ),
      )
      .orderBy(desc(invoices.createdAt)),
  ]);

  // Clients this talent has worked with (across shoots / projects / content).
  const workedClientIds = Array.from(
    new Set(
      [...shootRows, ...projectRows, ...contentRows]
        .map((r) => r.clientId)
        .filter((c): c is string => c != null),
    ),
  );

  // Client-facing invoices (money in) for those clients — not the talent's own pay.
  const clientInvoiceRows = workedClientIds.length
    ? await db
        .select({
          id: invoices.id,
          number: invoices.number,
          status: invoices.status,
          amountPence: invoices.amountPence,
          dueAt: invoices.dueAt,
          paidAt: invoices.paidAt,
          clientId: invoices.clientId,
          clientName: clients.name,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(
          and(
            eq(invoices.orgId, org),
            isNull(invoices.talentId),
            isNull(invoices.archivedAt),
            inArray(invoices.clientId, workedClientIds),
          ),
        )
        .orderBy(desc(invoices.createdAt))
    : [];

  // Assemble per-client groups (plus a null bucket for unassigned work).
  const groups = new Map<string, TalentClientGroup>();
  const keyFor = (cid: string | null) => cid ?? "__none__";
  const ensure = (cid: string | null, cname: string | null): TalentClientGroup => {
    const k = keyFor(cid);
    let g = groups.get(k);
    if (!g) {
      g = { clientId: cid, clientName: cname, shoots: [], projects: [], content: [], clientInvoices: [] };
      groups.set(k, g);
    }
    return g;
  };

  for (const s of shootRows) {
    ensure(s.clientId, s.clientName).shoots.push({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt,
      roleName: s.roleName,
      status: s.status as CastingStatus,
      ...eff(s.agreedRatePence),
    });
  }
  for (const p of projectRows) {
    ensure(p.clientId, p.clientName).projects.push({
      id: p.id,
      name: p.name,
      roleName: p.roleName,
      ...eff(p.agreedRatePence),
    });
  }
  for (const c of contentRows) {
    ensure(c.clientId, c.clientName).content.push({
      id: c.id,
      title: c.title,
      roleName: c.roleName,
    });
  }
  for (const inv of clientInvoiceRows) {
    const g = groups.get(keyFor(inv.clientId));
    if (g)
      g.clientInvoices.push({
        id: inv.id,
        number: inv.number,
        status: inv.status as InvoiceStatus,
        amountPence: inv.amountPence,
        dueAt: inv.dueAt,
        paidAt: inv.paidAt,
        clientName: inv.clientName,
      });
  }

  // Named clients first (alpha), null bucket last.
  const byClient = Array.from(groups.values()).sort((a, b) => {
    if (a.clientId == null) return 1;
    if (b.clientId == null) return -1;
    return (a.clientName ?? "").localeCompare(b.clientName ?? "");
  });

  const payments: TalentProfileInvoice[] = paymentRows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status as InvoiceStatus,
    amountPence: r.amountPence,
    dueAt: r.dueAt,
    paidAt: r.paidAt,
    clientName: r.clientName,
  }));

  const totalBookedPence =
    shootRows.reduce((sum, s) => sum + (s.agreedRatePence ?? rate ?? 0), 0) +
    projectRows.reduce((sum, p) => sum + (p.agreedRatePence ?? rate ?? 0), 0);
  const paidPence = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amountPence, 0);
  const outstandingPence = payments
    .filter((p) => ["sent", "approved", "overdue"].includes(p.status))
    .reduce((s, p) => s + p.amountPence, 0);

  return {
    talent: t,
    summary: {
      shootsCount: shootRows.length,
      clientsCount: workedClientIds.length,
      totalBookedPence,
      paidPence,
      outstandingPence,
    },
    payments,
    byClient,
  };
}
