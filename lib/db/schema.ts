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
export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "editing",
  "in_review",
  "changes_requested",
  "approved",
  "published",
]);
export const contentChannelEnum = pgEnum("content_channel", [
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "other",
]);
export const contentStatusEnum = pgEnum("content_status", [
  "idea",
  "scripting",
  "filming",
  "editing",
  "scheduled",
  "posted",
]);
export const castingStatusEnum = pgEnum("casting_status", [
  "pencilled",
  "confirmed",
  "released",
]);
export const availabilityKindEnum = pgEnum("availability_kind", [
  "available",
  "unavailable",
]);
/** Who bears a talent booking's cost: the client (re-billed) or the agency. */
export const costOwnerEnum = pgEnum("cost_owner", ["client", "agency"]);
/** How a talent booking is charged: by the hour, or a flat day rate. */
export const rateModeEnum = pgEnum("rate_mode", ["hourly", "day"]);
export const mediaKindEnum = pgEnum("media_kind", [
  "video",
  "image",
  "document",
  "audio",
  "other",
]);
export const mediaStatusEnum = pgEnum("media_status", [
  "pending", // row created, awaiting upload
  "uploaded", // bytes in the bucket
  "ready", // processed / usable
  "failed",
]);

// ── Tenancy ─────────────────────────────────────────────────────────────────
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Branding + billing details (used on invoices). */
  logoUrl: text("logo_url"),
  vatNumber: text("vat_number"),
  addressText: text("address_text"),
  billingEmail: text("billing_email"),
  defaultCurrency: text("default_currency").notNull().default("GBP"),
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
  brief: text("brief"),
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
  dayRatePence: integer("day_rate_pence"),
  /** Free-form skills/categories: ["presenter","voiceover",…] */
  tags: jsonb("tags").$type<string[]>().default([]),
  agentName: text("agent_name"),
  agentContact: text("agent_contact"),
  baseLocation: text("base_location"),
  instagram: text("instagram"),
  /** Payment details — visibility gated to can_see_actor_pay; masked in the UI. */
  bankAccountName: text("bank_account_name"),
  bankSortCode: text("bank_sort_code"),
  bankAccountNumber: text("bank_account_number"),
  heightCm: integer("height_cm"),
  wardrobeNotes: text("wardrobe_notes"), // sizes, fit notes
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Talent availability / unavailability windows (feeds clash detection). */
export const talentAvailability = pgTable("talent_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talent.id),
  kind: availabilityKindEnum("kind").notNull().default("unavailable"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Invoices (internal; Xero sync is a later integration) ─────────────────
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id").references(() => clients.id),
  /** When set, this invoice is a talent payment (money out) rather than a client bill. */
  talentId: uuid("talent_id").references(() => talent.id),
  number: text("number"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  amountPence: integer("amount_pence").notNull().default(0),
  /** VAT / tax rate as a whole-number percent (e.g. 20). */
  taxRatePct: integer("tax_rate_pct"),
  /** Online payment link (Stripe etc.). */
  paymentUrl: text("payment_url"),
  reference: text("reference"), // PO number / client ref
  terms: text("terms"),
  currency: text("currency").notNull().default("GBP"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Edits (deliverables / review & approvals) ─────────────────────────────
export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id").references(() => clients.id),
  shootId: uuid("shoot_id").references(() => shoots.id),
  title: text("title").notNull(),
  status: deliverableStatusEnum("status").notNull().default("editing"),
  versionLabel: text("version_label"), // e.g. "v1", "v2"
  previewUrl: text("preview_url"),
  reviewerUserId: uuid("reviewer_user_id"),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
  notes: text("notes"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Content calendar (planned social content) ─────────────────────────────
export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  channel: contentChannelEnum("channel").notNull().default("instagram"),
  status: contentStatusEnum("status").notNull().default("idea"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  /** Post copy / caption, hashtags and link for scheduling. */
  body: text("body"),
  hashtags: text("hashtags"),
  link: text("link"),
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Castings: talent linked to shoots / projects / content ────────────────
// Join tables. `agreed_rate_pence` is a per-booking override; when null the
// talent's standing `rate_per_hour_pence` applies (resolved in the data layer).

export const shootTalent = pgTable("shoot_talent", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  shootId: uuid("shoot_id")
    .notNull()
    .references(() => shoots.id),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talent.id),
  roleName: text("role_name"), // character / role on the day
  callTime: timestamp("call_time", { withTimezone: true }),
  agreedRatePence: integer("agreed_rate_pence"), // override: hourly amount, or day amount in day mode
  durationMinutes: integer("duration_minutes"), // hours worked (used when charging hourly)
  rateMode: rateModeEnum("rate_mode").notNull().default("hourly"),
  dayCount: integer("day_count"), // number of days in day mode (null = 1)
  costOwner: costOwnerEnum("cost_owner").notNull().default("client"),
  status: castingStatusEnum("status").notNull().default("pencilled"),
  rating: integer("rating"), // 1–5, set after the shoot
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectTalent = pgTable("project_talent", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talent.id),
  roleName: text("role_name"),
  agreedRatePence: integer("agreed_rate_pence"), // null = use talent hourly rate
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentTalent = pgTable("content_talent", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  contentItemId: uuid("content_item_id")
    .notNull()
    .references(() => contentItems.id),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talent.id),
  roleName: text("role_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** People we deal with at a client (billing, marketing, main point of contact…). */
export const clientContacts = pgTable("client_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  name: text("name").notNull(),
  roleTitle: text("role_title"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Edits: deliverable versions + review comments ─────────────────────────
export const deliverableVersions = pgTable("deliverable_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  deliverableId: uuid("deliverable_id")
    .notNull()
    .references(() => deliverables.id),
  label: text("label").notNull(), // e.g. "v1", "v2"
  previewUrl: text("preview_url"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewComments = pgTable("review_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  deliverableId: uuid("deliverable_id")
    .notNull()
    .references(() => deliverables.id),
  authorUserId: uuid("author_user_id"),
  body: text("body").notNull(),
  /** Optional self-reference for replies. */
  parentId: uuid("parent_id"),
  /** Optional video timecode (seconds) for frame-anchored notes. */
  timecodeSeconds: integer("timecode_seconds"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Finance: invoice line items ───────────────────────────────────────────
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPence: integer("unit_pence").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Media assets (uploaded files, auto-assignable to shoots/projects) ─────
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  uploaderUserId: uuid("uploader_user_id"),
  kind: mediaKindEnum("kind").notNull().default("other"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  storageProvider: text("storage_provider").notNull().default("r2"),
  storageKey: text("storage_key").notNull(), // path/key within the bucket
  status: mediaStatusEnum("status").notNull().default("pending"),
  durationSeconds: integer("duration_seconds"),
  width: integer("width"),
  height: integer("height"),
  // Where this asset belongs — auto-assigned on upload.
  shootId: uuid("shoot_id").references(() => shoots.id),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id").references(() => clients.id),
  deliverableId: uuid("deliverable_id").references(() => deliverables.id),
  contentItemId: uuid("content_item_id").references(() => contentItems.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schema = {
  organisations,
  memberships,
  clients,
  clientContacts,
  projects,
  tasks,
  shoots,
  servicePlans,
  addOns,
  activityLog,
  talent,
  talentAvailability,
  invoices,
  invoiceLineItems,
  deliverables,
  deliverableVersions,
  reviewComments,
  contentItems,
  shootTalent,
  projectTalent,
  contentTalent,
  mediaAssets,
};
