# Blanc Script OS — Locked Foundation (v0)

**This file is the single source of truth for all planning agents.** Do not contradict it.
If something here seems wrong, note it in your return summary as a flagged conflict — do **not** silently diverge.
Owner of this file and all final architectural decisions: the Lead Architect (coordinating session).

---

## 0. What we're building
**Blanc Script OS** — a premium operating system for a creative **video & photo production + social-media agency** (Blanc Script, Birmingham/UK, British English throughout).
It must be a real, working, secure multi-user application: CRM, projects/tasks, production, post-production, content/social, finance, team/talent, client & talent portals, and an AI intelligence layer.

**Reference point (not a template):** Centauri OS. A full public-surface reverse-engineering is in `docs/centauri-crm-analysis.md` (read it). We use it to learn the problem space and then **exceed** it. We do not copy their code, data, text or design.

## 1. Locked technical stack
- **Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion (sparingly). Installable **PWA**.
- **Hosting:** Vercel.
- **Database:** **Neon** (serverless Postgres). **Drizzle ORM**. Migrations via Drizzle Kit.
- **Row-Level Security:** Postgres RLS on every tenant-scoped table (see §4). This is the primary data-isolation mechanism.
- **Auth:** **Clerk** (organisations + roles). Clerk issues JWTs consumed by **Neon Authorize** so RLS policies read the authenticated user/role in the database.
- **File/media storage:** **Cloudflare R2** (S3-compatible). Signed URLs for secure access; no public buckets for client media.
- **Background jobs & schedules:** **Trigger.dev** (syncs, scheduled publishing, digests).
- **Email:** **Resend**.
- **AI:** **Anthropic Claude** — Haiku for routine/classification, Sonnet/Opus for reasoning. Bring-your-own-key, server-side only.
- **Video review/delivery:** Frame.io adapter (with a Cloudflare Stream fallback path to evaluate).
- Do **not** introduce dependencies beyond what a doc genuinely needs. Every integration sits behind an adapter interface so the app still runs if a provider is down.

## 2. Non-negotiable conventions
- DB identifiers `snake_case`; TypeScript `camelCase`; React components `PascalCase`.
- Every tenant-scoped table has `org_id uuid not null` + `created_at`/`updated_at` + RLS.
- UUID primary keys (`gen_random_uuid()`).
- Money stored as integer **minor units** (pence) + ISO currency code; never floats. UK VAT aware.
- All times stored UTC (`timestamptz`); display in Europe/London.
- Soft-delete (`archived_at`) for business records; hard-delete only via explicit GDPR erasure path.
- Secrets/service-role keys are **server-only**. Never ship them to the client. Public config is clearly separated.
- Feature-module folder structure (see MODULE_ARCHITECTURE). Shared UI in a design-system package/dir.
- Distinguish **implemented** vs **planned** in every doc. No fake data to disguise unfinished work. No dead buttons.

## 3. Roles & capabilities (refined from the Centauri analysis — improve, don't copy)
Internal roles: **owner**, **ops/admin**, **account_manager** (staff), **editor**, **filmer**.
External user types (portal-only, strongly isolated): **client_user**, **talent_user**.
Layer **capability flags** on roles, e.g. `can_see_money`, `can_invoice`, `can_pay_team`, `can_approve_pay`, `can_see_actor_pay`, `can_manage_users`, `can_settings`, `can_contract`, `can_edit_fees`, `can_archive`. Roles map to a default capability set; capabilities are individually overridable. The AI layer must act **within the current user's role + capabilities** and must not perform consequential actions without the appropriate permission + confirmation.

## 4. Data-model spine (DB agent OWNS the detail; everyone else CONSUMES this)
Normalized relational model — **one table per core entity**, not a single `records` table. Core entities (non-exhaustive; DB agent expands with columns, keys, constraints, indexes, RLS):
`organisations`, `users`(profiles, mirrors Clerk), `memberships`(user↔org+role+capabilities),
`companies`, `contacts`, `clients`(engagement/retainer), `leads`(pipeline), `client_notes`, `brand_assets`,
`projects`, `project_templates`, `tasks`, `task_dependencies`,
`shoots`, `shoot_briefs`, `shot_lists`, `call_sheets`, `locations`, `equipment`, `crew_assignments`,
`media_assets`(R2-backed), `edits`, `edit_assignments`, `reviews`, `revisions`, `approvals`, `deliveries`,
`content_items`, `content_calendar`, `social_posts`, `post_metrics`,
`quotes`, `proposals`, `invoices`, `invoice_lines`, `expenses`, `payments`, `retainers`,
`talent`(book), `talent_availability`, `talent_payments`(pay-runs),
`notifications`, `activity_log`(audit), `integrations`(per-org connection state), `ai_threads`/`ai_messages`.
Use JSONB only for genuinely variable metadata (e.g. per-platform post payloads, integration blobs). Every business table is `org_id`-scoped with RLS.

## 5. The 10 product systems (map features to these)
A. Command Centre · B. CRM & Client Management · C. Projects & Tasks · D. Production Studio ·
E. Post-production Studio · F. Content & Social Studio · G. Finance & Commercials ·
H. Team, Talent & Resources · I. Portals (client + talent) · J. Blanc Script AI.

## 6. Documentation set & single-owner assignments (no overlap)
Produce into `os/docs/`. Each agent writes ONLY its files, consistent with this foundation and the other docs' stated scope.
- **PRODUCT_VISION.md**, **PRODUCT_REQUIREMENTS.md** — Product agent
- **SYSTEM_ARCHITECTURE.md**, **ARCHITECTURE_DECISIONS.md** — Architecture agent
- **DATABASE_SCHEMA.md**, **MODULE_ARCHITECTURE.md** — Backend/DB agent
- **DESIGN_SYSTEM.md** — Design agent
- **USER_ROLES_AND_PERMISSIONS.md**, **SECURITY_AND_PRIVACY.md** — Security agent
- **INTEGRATIONS_ROADMAP.md** — Integrations agent
- **TESTING_STRATEGY.md** — QA agent
- **DEVELOPMENT_ROADMAP.md**, **AGENT_RESPONSIBILITIES.md**, **PROJECT_STATUS.md** — Lead (written after reconciliation)

## 7. Milestones (for roadmap alignment)
M1 Core Foundation (shell, auth, DB, profiles, permissions, nav, design system, responsive) →
M2 Core Operations (Command Centre, Clients, Projects, Tasks, Calendar, Team, Global search) →
M3 Production → M4 Post-production + Client portal → M5 Finance + Content/Social → M6 AI + Automation + Integrations.
Every implemented feature: real data model, persistence, validation, loading/empty/error states, permissions, responsive, tests where appropriate.
