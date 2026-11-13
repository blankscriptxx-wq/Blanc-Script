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
  "to_film", // planned from an approved script; not shot yet
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
// ── Per-client AI strategist ──────────────────────────────────────────────
export const knowledgeKindEnum = pgEnum("knowledge_kind", [
  "brand",
  "audience",
  "competitor",
  "guideline",
  "insight",
  "performance",
]);
export const knowledgeStatusEnum = pgEnum("knowledge_status", [
  "proposed", // AI suggested — awaiting a human nod
  "approved", // part of the brain
  "dismissed",
]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);
export const scriptFormatEnum = pgEnum("script_format", [
  "reel",
  "tiktok",
  "youtube_short",
  "youtube_long",
  "ad",
  "other",
]);
export const scriptStatusEnum = pgEnum("script_status", [
  "idea",
  "draft",
  "review",
  "approved",
  "produced",
]);
export const waStatusEnum = pgEnum("wa_status", ["open", "snoozed", "closed"]);
export const waDirectionEnum = pgEnum("wa_direction", ["inbound", "outbound"]);

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
  /** Stripe billing: the customer, their package subscription and its state. */
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** Stripe's status: active | trialing | past_due | unpaid | canceled | incomplete… */
  subscriptionStatus: text("subscription_status"),
  subscriptionPeriodEnd: timestamp("subscription_period_end", { withTimezone: true }),
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
  /** "YYYY-MM" when this is a package client's project for that month. */
  period: text("period"),
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
  // The project this shoot is for (optional; a shoot can be client-only).
  projectId: uuid("project_id").references(() => projects.id),
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
  /** Stripe product + the recurring price created for the current pricePence. */
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  stripePriceAmountPence: integer("stripe_price_amount_pence"),
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

// ── Invoices (the OS is the invoicing system; online payment via Stripe) ──
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
  /** Stripe Payment Link behind paymentUrl, and the gross amount it charges. */
  stripePaymentLinkId: text("stripe_payment_link_id"),
  stripeLinkAmountPence: integer("stripe_link_amount_pence"),
  /** Set when this invoice was generated from a Stripe (subscription) invoice. */
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  /** Link to the PDF/receipt for this invoice (Stripe-hosted when from Stripe). */
  documentUrl: text("document_url"),
  /** How it was paid, when known: card (Stripe) | cash | bank. */
  paymentMethod: text("payment_method"),
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
  /** Set when the comment was left by a client through the portal. */
  portalLinkId: uuid("portal_link_id"),
  authorName: text("author_name"),
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
  scriptId: uuid("script_id").references(() => scripts.id),
  /** Set when a client uploaded this through their portal (with their note). */
  portalLinkId: uuid("portal_link_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Outgoing email log (every email the OS sends, or tried to) ────────────
export const emailOutbox = pgTable("email_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  kind: text("kind").notNull(), // portal_invite | invoice | document | test | …
  status: text("status").notNull().default("queued"), // queued | sent | failed | not_configured
  error: text("error"),
  relatedType: text("related_type"),
  relatedId: uuid("related_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

// ── Documents: reusable templates and the copies issued to each client ────
export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name").notNull(),
  /** Text with merge fields such as {{client_name}} — see lib/documents/merge.ts. */
  body: text("body").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientDocuments = pgTable("client_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  templateId: uuid("template_id"),
  title: text("title").notNull(),
  /** The populated text as issued — a snapshot, never re-merged. */
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | accepted | void
  sentAt: timestamp("sent_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedByName: text("accepted_by_name"),
  acceptedByLinkId: uuid("accepted_by_link_id"),
  acceptedIp: text("accepted_ip"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Onboarding: what was agreed with a new client, and how far they've got ─
/** Extra agreed terms captured at onboarding; every one is optional. */
export type OnboardingTerms = {
  companyNumber?: string;
  registeredAddress?: string;
  billingAddress?: string;
  minimumTermMonths?: number | null;
  /** yyyy-mm-dd */
  startDate?: string;
  platforms?: string[];
  services?: string[];
  exclusions?: string;
  /** One-off projects: percentage taken up front (100 = the whole fee now). */
  depositPercent?: number;
  /** When the balance invoice goes out: when the client approves the work, or only when staff send it. */
  balanceTrigger?: "on_approval" | "manual";
  /** Set once the balance invoice has been raised. */
  balanceInvoiceId?: string;
  /** Generate and send the tailored Service Agreement with the welcome. */
  agreement?: boolean;
};

export type OnboardingExtra = { name: string; pricePence: number; cadence: "monthly" | "one_off" };

export const clientOnboardings = pgTable("client_onboardings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  status: text("status").notNull().default("draft"), // draft | sent | completed | cancelled
  /** subscription = a monthly package; one_off = a single project invoice. */
  billingType: text("billing_type").notNull().default("subscription"),
  servicePlanId: uuid("service_plan_id"),
  /** The agreed monthly price for the package (may differ from its list price). */
  monthlyPence: integer("monthly_pence"),
  projectTitle: text("project_title"),
  /** Add-ons (subscription) or the invoice lines (one-off project). */
  extras: jsonb("extras").$type<OnboardingExtra[]>().notNull().default([]),
  /** Agreed deliverables, one per line — shown to the client and merged into documents. */
  deliverables: text("deliverables"),
  templateIds: jsonb("template_ids").$type<string[]>().notNull().default([]),
  terms: jsonb("terms").$type<OnboardingTerms>().notNull().default({}),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  /** card = pays through Stripe; cash = pays us directly and staff mark it paid. */
  paymentMethod: text("payment_method").notNull().default("card"),
  welcomeNote: text("welcome_note"),
  portalLinkId: uuid("portal_link_id"),
  invoiceId: uuid("invoice_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Sign-in security: the second step (authenticator app and passkeys) ────
export const userSecurity = pgTable("user_security", {
  /** Neon Auth user id. */
  userId: uuid("user_id").primaryKey(),
  /** Authenticator-app secret, encrypted. Null until set up. */
  totpSecretEnc: text("totp_secret_enc"),
  /** Set once a code has been confirmed; until then the secret is only pending. */
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  /** One-time recovery codes, stored hashed. */
  recoveryHashes: jsonb("recovery_hashes").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passkeys = pgTable("passkeys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  credentialId: text("credential_id").notNull().unique(),
  /** Public key, base64url. */
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: jsonb("transports").$type<string[]>().notNull().default([]),
  name: text("name").notNull().default("Passkey"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

// ── Proposals: a branded web page sent to a prospect, accepted with a typed name ─
export type ProposalItem = { title: string; text: string };
export type ProposalContent = {
  preparedFor: string;
  heroLines: string[];
  heroIntro: string;
  opportunity: { heading: string; body: string; stats: { value: string; label: string }[] };
  whyNow: { heading: string; body: string; cards: ProposalItem[] };
  create: { heading: string; body: string; pillars: ProposalItem[] };
  process: { heading: string; steps: ProposalItem[] };
  investment: { heading: string; price: string; priceNote: string; body: string; includes: string[] };
  close: { heading: string; body: string };
};

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  token: text("token").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | accepted
  content: jsonb("content").$type<ProposalContent>().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedByName: text("accepted_by_name"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Client portal: unguessable share links, one per person given access ───
export const portalLinks = pgTable("portal_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  /** Who the link was given to (shown on their comments), e.g. "Hannah Fernley". */
  label: text("label").notNull(),
  token: text("token").notNull().unique(),
  /** Login-protected access: the invited email and, once claimed, their account. */
  email: text("email"),
  requiresLogin: boolean("requires_login").notNull().default(false),
  userId: uuid("user_id"),
  createdByUserId: uuid("created_by_user_id"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── WhatsApp inbox (sent and received through Aniro when connected) ───────
export const waConversations = pgTable("wa_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id").references(() => clients.id),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  /** The provider's id for this chat, when the conversation is live. */
  externalId: text("external_id"),
  status: waStatusEnum("status").notNull().default("open"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waMessages = pgTable("wa_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => waConversations.id),
  direction: waDirectionEnum("direction").notNull(),
  body: text("body").notNull(),
  authorUserId: uuid("author_user_id"),
  /** Provider message id (dedupes webhooks) and delivery state. */
  externalId: text("external_id"),
  deliveryStatus: text("delivery_status"), // stored | queued | sent | delivered | read | failed
  deliveryError: text("delivery_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The client's "brain" — core brand profile (1 per client). */
export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  brandSummary: text("brand_summary"),
  audience: text("audience"),
  tone: text("tone"),
  pillars: jsonb("pillars").$type<string[]>().default([]),
  dosAndDonts: text("dos_and_donts"),
  notes: text("notes"),
  researchedAt: timestamp("researched_at", { withTimezone: true }),
  /** Re-run web research automatically about once a month. */
  autoResearch: boolean("auto_research").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only knowledge that accumulates (competitors, insights, guidelines). */
export const clientKnowledge = pgTable("client_knowledge", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  kind: knowledgeKindEnum("kind").notNull().default("insight"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source"), // url, "chat", "research", "manual"
  status: knowledgeStatusEnum("status").notNull().default("proposed"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-client chat threads + messages. */
export const clientThreads = pgTable("client_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientMessages = pgTable("client_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => clientThreads.id),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Scripts the studio produces — visual hook + script hook + body. */
export const scripts = pgTable("scripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull(),
  format: scriptFormatEnum("format").notNull().default("reel"),
  status: scriptStatusEnum("status").notNull().default("idea"),
  /** Set when this script is a new version refined from another. */
  parentScriptId: uuid("parent_script_id"),
  /** The project this script belongs to, and the shoot it is filmed on. */
  projectId: uuid("project_id").references(() => projects.id),
  shootId: uuid("shoot_id").references(() => shoots.id),
  hookVisual: text("hook_visual"),
  hookScript: text("hook_script"),
  body: text("body"),
  notes: text("notes"),
  /** The AI's lasting memory of this script (idea, hook, angle), so it is never repeated. */
  memory: text("memory"),
  // Workflow links once pushed out.
  contentItemId: uuid("content_item_id").references(() => contentItems.id),
  deliverableId: uuid("deliverable_id").references(() => deliverables.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schema = {
  organisations,
  memberships,
  clients,
  clientContacts,
  clientProfiles,
  clientKnowledge,
  clientThreads,
  clientMessages,
  scripts,
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
  waConversations,
  waMessages,
};
