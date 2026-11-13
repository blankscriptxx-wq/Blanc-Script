import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  clientContacts,
  clients,
  invoices,
  projects,
  servicePlans,
  shoots,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import type { InvoiceStatus } from "@/lib/data/finance";
import { invoiceGrossPence } from "@/lib/data/finance";

export type ClientProfileShootStatus =
  | "booked"
  | "on_site"
  | "wrapped"
  | "cancelled";
export type ClientProfileProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "complete"
  | "cancelled";

export type ClientProfileContact = {
  id: string;
  name: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};
export type ClientProfileProject = {
  id: string;
  name: string;
  status: ClientProfileProjectStatus;
};
export type ClientProfileShoot = {
  id: string;
  title: string;
  status: ClientProfileShootStatus;
  scheduledAt: Date | null;
};
export type ClientProfileInvoice = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  amountPence: number;
  dueAt: Date | null;
};
export type ClientProfileActivity = {
  id: string;
  action: string;
  createdAt: Date;
  meta: Record<string, unknown> | null;
};

export type ClientProfile = {
  /** False when the viewer lacks see-money: fees, invoices and balances are withheld. */
  canSeeMoney: boolean;
  client: {
    id: string;
    name: string;
    status: "lead" | "active" | "paused" | "churned";
    planName: string | null;
    planPricePence: number | null;
    retainerOverridePence: number | null;
    currency: string;
    createdAt: Date;
    selfShoot: boolean;
  };
  summary: {
    projectsCount: number;
    shootsCount: number;
    outstandingPence: number;
    planName: string | null;
    mrrPence: number | null;
  };
  contacts: ClientProfileContact[];
  projects: ClientProfileProject[];
  shoots: ClientProfileShoot[];
  invoices: ClientProfileInvoice[];
  activity: ClientProfileActivity[];
};

export async function getClientProfile(id: string): Promise<ClientProfile | null> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();

  const [c] = await db
    .select({
      id: clients.id,
      name: clients.name,
      status: clients.status,
      planName: servicePlans.name,
      planPricePence: servicePlans.pricePence,
      retainerOverridePence: clients.retainerOverridePence,
      currency: clients.currency,
      createdAt: clients.createdAt,
      selfShoot: clients.selfShoot,
    })
    .from(clients)
    .leftJoin(servicePlans, eq(clients.servicePlanId, servicePlans.id))
    .where(and(eq(clients.id, id), eq(clients.orgId, org)))
    .limit(1);
  if (!c) return null;

  const [contactRows, projectRows, shootRows, invoiceRows, activityRows] =
    await Promise.all([
      db
        .select({
          id: clientContacts.id,
          name: clientContacts.name,
          roleTitle: clientContacts.roleTitle,
          email: clientContacts.email,
          phone: clientContacts.phone,
          isPrimary: clientContacts.isPrimary,
        })
        .from(clientContacts)
        .where(
          and(eq(clientContacts.orgId, org), eq(clientContacts.clientId, id)),
        )
        .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt)),
      db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
        })
        .from(projects)
        .where(
          and(
            eq(projects.orgId, org),
            eq(projects.clientId, id),
            isNull(projects.archivedAt),
          ),
        )
        .orderBy(desc(projects.createdAt)),
      db
        .select({
          id: shoots.id,
          title: shoots.title,
          status: shoots.status,
          scheduledAt: shoots.scheduledAt,
        })
        .from(shoots)
        .where(
          and(
            eq(shoots.orgId, org),
            eq(shoots.clientId, id),
            isNull(shoots.archivedAt),
          ),
        )
        .orderBy(desc(shoots.scheduledAt)),
      db
        .select({
          id: invoices.id,
          number: invoices.number,
          status: invoices.status,
          amountPence: invoiceGrossPence,
          dueAt: invoices.dueAt,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.orgId, org),
            eq(invoices.clientId, id),
            isNull(invoices.talentId),
            isNull(invoices.archivedAt),
          ),
        )
        .orderBy(desc(invoices.createdAt)),
      db
        .select({
          id: activityLog.id,
          action: activityLog.action,
          createdAt: activityLog.createdAt,
          meta: activityLog.meta,
        })
        .from(activityLog)
        .where(
          and(
            eq(activityLog.orgId, org),
            eq(activityLog.entityType, "client"),
            eq(activityLog.entityId, id),
          ),
        )
        .orderBy(desc(activityLog.createdAt))
        .limit(12),
    ]);

  // Fees, invoices and balances are money: hidden without the capability.
  const canSeeMoney = user.capabilities.has("can_see_money");
  if (!canSeeMoney) {
    invoiceRows.length = 0;
    c.planPricePence = null;
    c.retainerOverridePence = null;
  }

  const invoiceList: ClientProfileInvoice[] = invoiceRows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status as InvoiceStatus,
    amountPence: r.amountPence,
    dueAt: r.dueAt,
  }));

  const outstandingPence = invoiceList
    .filter((i) => ["sent", "approved", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + i.amountPence, 0);

  const mrrPence = c.retainerOverridePence ?? c.planPricePence ?? null;

  return {
    client: c,
    canSeeMoney,
    summary: {
      projectsCount: projectRows.length,
      shootsCount: shootRows.length,
      outstandingPence,
      planName: c.planName,
      mrrPence,
    },
    contacts: contactRows,
    projects: projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status as ClientProfileProjectStatus,
    })),
    shoots: shootRows.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status as ClientProfileShootStatus,
      scheduledAt: s.scheduledAt,
    })),
    invoices: invoiceList,
    activity: activityRows.map((a) => ({
      id: a.id,
      action: a.action,
      createdAt: a.createdAt,
      meta: a.meta ?? null,
    })),
  };
}

export const clientContactInput = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(160),
  roleTitle: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().email("Enter a valid email").max(254).nullable().optional(),
  phone: z.string().trim().max(60).nullable().optional(),
  isPrimary: z.boolean().optional(),
});
export type ClientContactInput = z.infer<typeof clientContactInput>;

export async function addClientContact(input: ClientContactInput) {
  const user = await requireUser();
  const data = clientContactInput.parse(input);
  const db = getDb();

  // Org-guard: the client must belong to the caller's org.
  const [owner] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, data.clientId), eq(clients.orgId, user.orgId)))
    .limit(1);
  if (!owner) throw new Error("Client not found.");

  const [row] = await db
    .insert(clientContacts)
    .values({
      orgId: user.orgId,
      clientId: data.clientId,
      name: data.name,
      roleTitle: data.roleTitle ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      isPrimary: data.isPrimary ?? false,
    })
    .returning({ id: clientContacts.id });

  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "client.contact.added",
    entityType: "client",
    entityId: data.clientId,
    meta: { name: data.name, roleTitle: data.roleTitle ?? null },
  });

  return row;
}

/** Who films this client's content: our team, or the client themselves. */
export async function setClientSelfShoot(clientId: string, selfShoot: boolean) {
  const user = await requireUser();
  await getDb()
    .update(clients)
    .set({ selfShoot, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.orgId, user.orgId)));
}
