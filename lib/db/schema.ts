/**
 * Drizzle schema — Milestone 1 core slice.
 *
 * This is the authoritative-model's foundation (full model: docs/DATABASE_SCHEMA.md).
 * M1 ships the tenancy spine + a few core business tables so the app has real
 * types to build against; later milestones add the remaining entities via
 * forward-only migrations. Every business table is org-scoped and soft-deletable;
 * RLS policies (added with the migrations) enforce tenancy + capabilities in Neon.
 *
 * Conventions: snake_case columns, uuid PKs, timestamptz, money as integer pence.
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

// ── Tenancy spine ───────────────────────────────────────────────────────────
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mirrors the Clerk user; one row per human regardless of org. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A user's place in an org: their role, capability overrides, and portal scope. */
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  role: roleEnum("role").notNull(),
  status: membershipStatusEnum("status").notNull().default("invited"),
  /** Effective capability overrides, keyed by capability name → boolean. */
  capabilities: jsonb("capabilities").$type<Record<string, boolean>>().default({}),
  /** Portal isolation anchors (null for internal staff). */
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
  accountManagerId: uuid("account_manager_id").references(() => users.id),
  /** Monthly retainer value in pence. */
  retainerPence: integer("retainer_pence"),
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
  assigneeId: uuid("assignee_id").references(() => users.id),
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

/** Append-only audit trail (includes AI + impersonation actions in later milestones). */
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

export const schema = {
  organisations,
  users,
  memberships,
  clients,
  projects,
  tasks,
  shoots,
  activityLog,
};
