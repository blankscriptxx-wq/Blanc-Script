import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
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
import { listAvailability, type AvailabilityRow } from "@/lib/data/talent";
import { bookingCostPence, type CastingStatus } from "@/lib/data/castings";
import type { InvoiceStatus } from "@/lib/data/finance";

export type TalentProfileShoot = {
  id: string;
  title: string;
  scheduledAt: Date | null;
  roleName: string | null;
  status: CastingStatus;
  effectiveRatePence: number | null;
  rateIsOverride: boolean;
  durationMinutes: number | null;
  rateMode: "hourly" | "day";
  costPence: number | null;
  costOwner: "client" | "agency";
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
  /** Talent cost this client is being re-billed for (sum of client-borne bookings). */
  billedToClientPence: number;
  /** Talent cost Blanc Script is absorbing for this client's work. */
  absorbedPence: number;
};

export type TalentProfile = {
  talent: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: "active" | "inactive" | "archived";
    ratePerHourPence: number | null;
    dayRatePence: number | null;
    tags: string[];
    agentName: string | null;
    agentContact: string | null;
    baseLocation: string | null;
    instagram: string | null;
    notes: string | null;
    createdAt: Date;
    /** Only populated when the viewer holds can_see_actor_pay. */
    bankAccountName: string | null;
    bankSortCode: string | null;
    bankAccountNumber: string | null;
  };
  canSeePay: boolean;
  summary: {
    shootsCount: number;
    clientsCount: number;
    /** Total talent cost across bookings with known hours. */
    totalCostPence: number;
    /** Portion re-billed to clients. */
    clientBilledPence: number;
    /** Portion Blanc Script absorbs. */
    absorbedPence: number;
    paidPence: number;
    outstandingPence: number;
  };
  availability: AvailabilityRow[];
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
      dayRatePence: talent.dayRatePence,
      tags: talent.tags,
      agentName: talent.agentName,
      agentContact: talent.agentContact,
      baseLocation: talent.baseLocation,
      instagram: talent.instagram,
      notes: talent.notes,
      createdAt: talent.createdAt,
      bankAccountName: talent.bankAccountName,
      bankSortCode: talent.bankSortCode,
      bankAccountNumber: talent.bankAccountNumber,
    })
    .from(talent)
    .where(and(eq(talent.id, id), eq(talent.orgId, org)))
    .limit(1);
  if (!t) return null;

  const canSeePay = user.capabilities.has("can_see_actor_pay");

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
        durationMinutes: shootTalent.durationMinutes,
        rateMode: shootTalent.rateMode,
        costOwner: shootTalent.costOwner,
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

  // Assemble per-client groups (plus a null bucket for unassigned work).
  const groups = new Map<string, TalentClientGroup>();
  const keyFor = (cid: string | null) => cid ?? "__none__";
  const ensure = (cid: string | null, cname: string | null): TalentClientGroup => {
    const k = keyFor(cid);
    let g = groups.get(k);
    if (!g) {
      g = {
        clientId: cid,
        clientName: cname,
        shoots: [],
        projects: [],
        content: [],
        billedToClientPence: 0,
        absorbedPence: 0,
      };
      groups.set(k, g);
    }
    return g;
  };

  let totalCostPence = 0;
  let clientBilledPence = 0;
  let absorbedPence = 0;

  for (const s of shootRows) {
    const e = eff(s.agreedRatePence);
    const costPence = bookingCostPence({
      mode: s.rateMode as "hourly" | "day",
      agreedRatePence: s.agreedRatePence,
      talentHourlyPence: t.ratePerHourPence,
      talentDayPence: t.dayRatePence,
      durationMinutes: s.durationMinutes,
    });
    const owner = s.costOwner as "client" | "agency";
    const g = ensure(s.clientId, s.clientName);
    g.shoots.push({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt,
      roleName: s.roleName,
      status: s.status as CastingStatus,
      ...e,
      durationMinutes: s.durationMinutes,
      rateMode: s.rateMode as "hourly" | "day",
      costPence,
      costOwner: owner,
    });
    if (costPence != null) {
      totalCostPence += costPence;
      if (owner === "client") {
        g.billedToClientPence += costPence;
        clientBilledPence += costPence;
      } else {
        g.absorbedPence += costPence;
        absorbedPence += costPence;
      }
    }
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

  const paidPence = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amountPence, 0);
  const outstandingPence = payments
    .filter((p) => ["sent", "approved", "overdue"].includes(p.status))
    .reduce((s, p) => s + p.amountPence, 0);

  const availability = await listAvailability(id);

  return {
    talent: {
      ...t,
      tags: t.tags ?? [],
      bankAccountName: canSeePay ? t.bankAccountName : null,
      bankSortCode: canSeePay ? t.bankSortCode : null,
      bankAccountNumber: canSeePay ? t.bankAccountNumber : null,
    },
    canSeePay,
    summary: {
      shootsCount: shootRows.length,
      clientsCount: workedClientIds.length,
      totalCostPence,
      clientBilledPence,
      absorbedPence,
      paidPence,
      outstandingPence,
    },
    availability,
    payments,
    byClient,
  };
}
