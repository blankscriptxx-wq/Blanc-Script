/**
 * Drizzle schema — Milestone 1 core slice (public schema).
 *
 * Auth tables (user/session/account/organization/member/invitation/jwks/verification)
 * are owned by **Neon Auth (Managed Better Auth)** in the `neon_auth` schema — we do
 * NOT define them here. Our tables reference the Neon Auth user id as a plain uuid
 * (`user_id`, `account_manager_id`, …); integrity is enforced in the app + RLS, not a
 * cross-schema FK. Full model: docs/DATABASE_SCHEMA.md.
 *
 * Conventions: snake_case columns, uuid PKs, timestamptz, money as integer pence.
 * RLS policies are added in the security step (Neon Authorize reads the Neon Auth JWT).
 */
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", [
  "owner",
  "ops",
  "account_manager",
  "editor",
  "filmer",
  "client_user",
  "talent_user",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
]);
export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "active",
  "paused",
  "churned",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "complete",
  "cancelled",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "blocked",
  "done",
]);
export const shootStatusEnum = pgEnum("shoot_status", [
  "booked",
  "on_site",
  "wrapped",
  "cancelled",
]);
export const planBillingEnum = pgEnum("plan_billing", ["monthly", "bespoke"]);
export const addonCadenceEnum = pgEnum("addon_cadence", [
  "monthly",
  "one_off",
  "hourly",
  "per_job",
  "bespoke",
]);
export const talentStatusEnum = pgEnum("talent_status", [
  "active",
  "inactive",
  "archived",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "approved",
  "paid",
  "overdue",
]);

// ── Tenancy ─────────────────────────────────────────────────────────────────
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A Neon Auth user's place in an org: role, capability overrides, portal scope. */
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  /** Neon Auth (neon_auth.user) id — no cross-schema FK; enforced in app + RLS. */
  userId: uuid("user_id").notNull(),
  role: roleEnum("role").notNull(),
  status: membershipStatusEnum("status").notNull().default("invited"),
  capabilities: jsonb("capabilities").$type<Record<string, boolean>>().default({}),
  clientId: uuid("client_id"),
  talentId: uuid("talent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Core business tables (M1 slice) ─────────────────────────────────────────
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name").notNull(),
  status: clientStatusEnum("status").notNull().default("lead"),
  accountManagerId: uuid("account_manager_id"),
  servicePlanId: uuid("service_plan_id").references(() => servicePlans.id),
  /** Per-client monthly override in pence (null = use the plan's price). */
  retainerOverridePence: integer("retainer_override_pence"),
  currency: text("currency").notNull().default("GBP"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id").references(() => clients.id),
  name: text("name").notNull(),
  status: projectStatusEnum("status").notNull().default("planning"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id"),
  title: text("title").notNull(),
  status: taskStatusEnum("status").notNull().default("todo"),
  assigneeId: uuid("assignee_id"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shoots = pgTable("shoots", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  status: shootStatusEnum("status").notNull().default("booked"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  locationName: text("location_name"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Service plans & add-ons (seeded from docs/service-packages.md) ──────────
export const servicePlans = pgTable("service_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  code: text("code").notNull(), // STILLS, ON_AIR, PRIME_TIME, HEADLINE, OFF_SCRIPT
  name: text("name").notNull(),
  pricePence: integer("price_pence"), // null for bespoke
  billing: planBillingEnum("billing").notNull().default("monthly"),
  mostPopular: boolean("most_popular").notNull().default(false),
  bespoke: boolean("bespoke").notNull().default(false),
  /** Volumes & inclusions (videos_per_week, total_posts_per_month, ai_inbox, …). */
  features: jsonb("features").$type<Record<string, unknown>>().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const addOns = pgTable("add_ons", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name").notNull(),
  pricePence: integer("price_pence"), // null = competitive/bespoke
  cadence: addonCadenceEnum("cadence").notNull().default("monthly"),
  freeWithPlanCode: text("free_with_plan_code"), // e.g. AI Inbox free with HEADLINE
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only audit trail. */
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Talent book (on-camera talent/actors) ─────────────────────────────────
export const talent = pgTable("talent", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: talentStatusEnum("status").notNull().default("active"),
  ratePerHourPence: integer("rate_per_hour_pence"),
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Invoices (internal; Xero sync is a later integration) ─────────────────
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id").references(() => clients.id),
  number: text("number"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  amountPence: integer("amount_pence").notNull().default(0),
  currency: text("currency").notNull().default("GBP"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schema = {
  organisations,
  memberships,
  clients,
  projects,
  tasks,
  shoots,
  servicePlans,
  addOns,
  activityLog,
  talent,
  invoices,
};
