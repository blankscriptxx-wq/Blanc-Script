import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  activityLog,
  deliverables,
  invoices,
  shoots,
  tasks,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { invoiceGrossPence } from "@/lib/data/finance";

/**
 * Today / command-centre feed. Everything here is org-scoped via `requireUser()`
 * and read-only. British English + GBP pence formatting throughout.
 */

export type NeedsYouKind = "invoice" | "shoot" | "task" | "deliverable";
export type NeedsYouTone = "danger" | "warning" | "accent" | "success";

export type NeedsYouItem = {
  id: string;
  kind: NeedsYouKind;
  title: string;
  /** A short human line: a formatted date and/or amount. */
  meta: string;
  href: string;
  tone: NeedsYouTone;
  /** Internal urgency key (ms since epoch) — most urgent sorts first. */
  urgency: number;
};

export type NeedsYouResult = {
  items: NeedsYouItem[];
  counts: Record<NeedsYouKind, number>;
};

const FEED_CAP = 12;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/London",
});

function formatPence(pence: number): string {
  return gbp.format(pence / 100);
}

function startOfLondonDay(d: Date): number {
  // Midnight today in Europe/London, as a millisecond timestamp.
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/London",
  }).format(d);
  return new Date(`${parts}T00:00:00Z`).getTime();
}

function describeWhen(due: Date | null, now: Date): string {
  if (!due) return "No date set";
  const day = startOfLondonDay(due);
  const today = startOfLondonDay(now);
  const diffDays = Math.round((day - today) / 86_400_000);
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return n === 1 ? "Overdue by 1 day" : `Overdue by ${n} days`;
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return dateFmt.format(due);
}

export async function getNeedsYou(): Promise<NeedsYouResult> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();

  const now = new Date();
  const in3d = new Date(now.getTime() + 3 * 86_400_000);
  const in7d = new Date(now.getTime() + 7 * 86_400_000);

  const [invoiceRows, shootRows, taskRows, deliverableRows] = await Promise.all([
    // Overdue invoices: explicitly overdue, OR sent but past their due date.
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        amountPence: invoiceGrossPence,
        dueAt: invoices.dueAt,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, org),
          isNull(invoices.archivedAt),
          or(
            eq(invoices.status, "overdue"),
            and(eq(invoices.status, "sent"), lte(invoices.dueAt, now)),
          ),
        ),
      )
      .orderBy(desc(invoices.dueAt)),
    // Shoots happening today or in the next 7 days.
    db
      .select({
        id: shoots.id,
        title: shoots.title,
        scheduledAt: shoots.scheduledAt,
        status: shoots.status,
      })
      .from(shoots)
      .where(
        and(
          eq(shoots.orgId, org),
          isNull(shoots.archivedAt),
          inArray(shoots.status, ["booked", "on_site"]),
          isNotNull(shoots.scheduledAt),
          lte(shoots.scheduledAt, in7d),
        ),
      )
      .orderBy(desc(shoots.scheduledAt)),
    // Tasks overdue or due within three days (not done).
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueAt: tasks.dueAt,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, org),
          isNull(tasks.archivedAt),
          inArray(tasks.status, ["todo", "in_progress", "blocked"]),
          isNotNull(tasks.dueAt),
          lte(tasks.dueAt, in3d),
        ),
      )
      .orderBy(desc(tasks.dueAt)),
    // Deliverables needing attention (in review / changes requested).
    db
      .select({
        id: deliverables.id,
        title: deliverables.title,
        dueAt: deliverables.dueAt,
        status: deliverables.status,
      })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.orgId, org),
          isNull(deliverables.archivedAt),
          inArray(deliverables.status, ["in_review", "changes_requested"]),
        ),
      )
      .orderBy(desc(deliverables.updatedAt)),
  ]);

  // Money is capability-gated: without it, invoices never appear in the feed.
  if (!user.capabilities.has("can_see_money")) invoiceRows.length = 0;


  const items: NeedsYouItem[] = [];

  for (const inv of invoiceRows) {
    const label = inv.number ? `Invoice ${inv.number}` : "Invoice";
    const when = describeWhen(inv.dueAt, now);
    const whenBit = when.startsWith("Overdue") ? when : `Due ${when}`;
    items.push({
      id: inv.id,
      kind: "invoice",
      title: `${label} needs chasing`,
      meta: `${formatPence(inv.amountPence)} · ${whenBit}`,
      href: "/finance",
      tone: "danger",
      // Older due dates are more urgent → smaller urgency value.
      urgency: inv.dueAt ? inv.dueAt.getTime() : 0,
    });
  }

  for (const shoot of shootRows) {
    const when = describeWhen(shoot.scheduledAt, now);
    const soon = shoot.status === "on_site" || when === "Today" || when === "Tomorrow";
    items.push({
      id: shoot.id,
      kind: "shoot",
      title: shoot.title,
      meta: shoot.status === "on_site" ? `On site · ${when}` : when,
      href: "/shoots",
      tone: soon ? "warning" : "accent",
      urgency: shoot.scheduledAt ? shoot.scheduledAt.getTime() : now.getTime(),
    });
  }

  for (const task of taskRows) {
    const when = describeWhen(task.dueAt, now);
    const overdue = when.startsWith("Overdue");
    items.push({
      id: task.id,
      kind: "task",
      title: task.title,
      meta: overdue ? when : `Due ${when}`,
      href: "/projects",
      tone: overdue ? "danger" : "warning",
      urgency: task.dueAt ? task.dueAt.getTime() : now.getTime(),
    });
  }

  for (const del of deliverableRows) {
    const changes = del.status === "changes_requested";
    items.push({
      id: del.id,
      kind: "deliverable",
      title: del.title,
      meta: changes ? "Changes requested" : "Awaiting review",
      href: "/edits",
      tone: changes ? "warning" : "accent",
      urgency: del.dueAt ? del.dueAt.getTime() : now.getTime(),
    });
  }

  const counts: Record<NeedsYouKind, number> = {
    invoice: invoiceRows.length,
    shoot: shootRows.length,
    task: taskRows.length,
    deliverable: deliverableRows.length,
  };

  // Priority: danger first, then warning, then the rest — soonest within each.
  const toneRank: Record<NeedsYouTone, number> = {
    danger: 0,
    warning: 1,
    accent: 2,
    success: 3,
  };
  items.sort((a, b) => {
    if (toneRank[a.tone] !== toneRank[b.tone]) {
      return toneRank[a.tone] - toneRank[b.tone];
    }
    return a.urgency - b.urgency;
  });

  return { items: items.slice(0, FEED_CAP), counts };
}

// ── Recent activity ─────────────────────────────────────────────────────────

export type ActivityItem = {
  id: string;
  label: string;
  when: string;
};

/** Friendly verbs for the known action keys; unknown keys fall back below. */
const ACTION_LABELS: Record<string, string> = {
  "script.pushed_to_content": "Pushed a script to Content",
  "script.created": "Created a script",
  "invoice.paid_online": "An invoice was paid online",
  "invoice.payment_link.created": "Created a payment link",
  "invoice.autodrafted": "Drafted a talent payment",
  "invoice.updated": "Updated an invoice",
  "invoice.voided": "Voided an invoice",
  "deliverable.client_approved": "A client approved a cut",
  "deliverable.client_requested_changes": "A client requested changes on a cut",
  "deliverable.client_commented": "A client commented on a cut",
  "deliverable.status_changed": "Changed a cut's status",
  "deliverable.version_added": "Added a new version of a cut",
  "deliverable.updated": "Updated a cut",
  "deliverable.archived": "Archived a cut",
  "deliverable.comment_resolved": "Resolved a review comment",
  "deliverable.comment_reopened": "Reopened a review comment",
  "portal.link_created": "Created a client portal link",
  "client.research_refreshed": "Client research was refreshed",
  "client.contact.added": "Added a client contact",
  "casting.shoot.added": "Cast talent on a shoot",
  "casting.project.added": "Cast talent on a project",
  "casting.content.added": "Cast talent on a content item",
  "content.created": "Added a content item",
  "content.updated": "Updated a content item",
  "task.moved": "Moved a task",
  "plan.created": "Added a package",
  "plan.updated": "Updated a package",
  "plan.archived": "Removed a package",
  "addon.created": "Added an add-on",
  "addon.updated": "Updated an add-on",
  "addon.archived": "Removed an add-on",
  "wa_conversation.created": "Started a WhatsApp conversation",
  "wa_conversation.status_changed": "Changed a conversation's status",
  "member.role_changed": "Changed a team member's role",
  "member.capability_changed": "Changed a team member's access",
  "workspace.renamed": "Renamed the workspace",
  "workspace.updated": "Updated workspace details",
  "invoice.line_item.added": "Added an invoice line",
  "invoice.line_item.removed": "Removed an invoice line",
  "invoice.status_changed": "Changed an invoice's status",
  "client.created": "Added a client",
  "client.updated": "Updated a client",
  "client.archived": "Archived a client",
  "project.created": "Started a project",
  "project.updated": "Updated a project",
  "project.completed": "Completed a project",
  "shoot.created": "Booked a shoot",
  "shoot.updated": "Updated a shoot",
  "task.created": "Added a task",
  "task.completed": "Completed a task",
  "invoice.created": "Raised an invoice",
  "invoice.sent": "Sent an invoice",
  "invoice.paid": "Marked an invoice paid",
  "deliverable.created": "Added a deliverable",
  "deliverable.approved": "Approved an edit",
  "talent.created": "Added talent",
};

const VERB_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  archived: "Archived",
  deleted: "Removed",
  completed: "Completed",
  sent: "Sent",
  paid: "Marked paid",
  approved: "Approved",
};

function friendlyAction(action: string, entityType: string | null): string {
  const known = ACTION_LABELS[action];
  if (known) return known;
  // Fallback for actions without a hand-written label, e.g.
  // "content.status_changed" → "Status changed a content item".
  const words = (v: string) => v.replace(/[_-]+/g, " ").trim();
  const parts = action.split(".");
  const verb = parts.length > 1 ? parts[parts.length - 1] : "";
  const noun = words(entityType ?? parts[0] ?? "record") || "record";
  const label = verb ? VERB_LABELS[verb] ?? words(verb) : "Updated";
  const v = label.charAt(0).toUpperCase() + label.slice(1);
  const article = /^[aeiou]/i.test(noun) ? "an" : "a";
  return `${v} ${article} ${noun}`;
}

function relativeWhen(then: Date, now: Date): string {
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "Yesterday" : `${days} days ago`;
  return dateFmt.format(then);
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const user = await requireUser();
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(eq(activityLog.orgId, user.orgId))
    .orderBy(desc(activityLog.createdAt))
    .limit(10);

  return rows.map((r) => ({
    id: r.id,
    label: friendlyAction(r.action, r.entityType),
    when: relativeWhen(r.createdAt, now),
  }));
}
