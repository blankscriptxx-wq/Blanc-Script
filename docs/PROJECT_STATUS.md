# Blanc Script OS — Project Status

**Updated:** 11 Nov 2026
**Phase:** Milestone 1 foundation **scaffolded** (placeholder mode) — builds green.
**Location:** Branch `blanc-script-os`, OS at repo root. Isolated from the marketing site; live site untouched.
**Database:** Neon, provisioned via the **Vercel–Neon integration** (Vercel injects `DATABASE_URL`) when we wire — not a standalone Neon project.

## Milestone 1 — scaffolded (placeholder mode, `npm run build` green)
- Next.js 14 (App Router) + TypeScript + Tailwind, OS design-token layer (`--bs-*`, light/dark) from `DESIGN_SYSTEM.md`.
- Design-system components: Button, Card/StatCard, StatusPill, EmptyState, PageHeader.
- App shell: sidebar (capability-filtered nav), topbar, **⌘K command palette**, theme toggle, responsive.
- Auth abstraction (`lib/auth/session.ts`) in placeholder mode (dev identity) — drop-in for Clerk.
- Capability model (`lib/auth/roles.ts`): roles + ~18 capability flags + resolver, per `USER_ROLES_AND_PERMISSIONS.md`.
- Drizzle schema (`lib/db/schema.ts`): tenancy spine + core tables (clients, projects, tasks, shoots, activity_log) + enums; DB client guarded until `DATABASE_URL` is set.
- Today dashboard with **honest empty/placeholder states** (no fabricated figures); module routes stubbed as "arriving in Mx".
- PWA manifest, env template (`.env.example`), Drizzle config.
- **Not yet wired (needs accounts):** Clerk auth, Neon connection + migrations/RLS, R2, Trigger.dev, Resend, Anthropic.

## Completed
- **Public-surface reverse-engineering of Centauri OS** (`../docs/centauri-crm-analysis.md`).
- **Locked foundation** (`_FOUNDATION.md`): stack, conventions, data-model spine, roles.
- **All 13 planning documents**, produced by 7 concurrent specialist agents and reconciled by the Lead:
  Product (Vision, Requirements), Architecture (System, ADRs), Database (Schema, Modules), Design System, Security (Roles/Permissions, Security/Privacy), Integrations, Testing, plus Lead docs (Roadmap, Agent Responsibilities, this file).
- **Reconciliation decisions D1–D14** ratified (see `DEVELOPMENT_ROADMAP.md`).

## Stack (locked)
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · Neon Postgres + Drizzle + RLS · Clerk (→ Neon Authorize) · Cloudflare R2 · Trigger.dev · Resend · Anthropic Claude · Vercel · PWA. Realtime: SSE/poll first (D1).

## Current work
- Lead: finalising planning integration; preparing the `blanc-script-os` branch and the Milestone 1 scaffold.

## Technical decisions (headlines)
- Relational schema (one table per entity), **not** Centauri's single ~130-kind `records` table.
- Three-layer authorisation: tenant (org_id, RLS) · role (seed) · **capability flag (the real, DB-enforced gate)**.
- Portals = RLS-backed view layer; external users are Clerk users scoped by `memberships.client_id/talent_id`.
- Every integration behind a port/adapter with a NullAdapter; app degrades gracefully.
- AI acts only *as* the user, through the same DAL + RLS + capability guards; pay release is never an AI action.

## Provider decisions — RESOLVED (11 Nov 2026)
1. **Video** (M4): **Frame.io**.
2. **Social** (M5): **Metricool** now; later direct Meta publishing via **Aniro AI's** reviewed Meta app.
3. **Payouts** (M6): **Monzo Business** — OS prepares pay-run + exports a bank-ready file (no payouts API); automated rail optional later.
4. **WhatsApp** (M6): **Periskope** now; later build on **Aniro AI's** WhatsApp inbox (see `aniro-whatsapp-integration-brief.md`).
5. **Stored client logins**: **in v1** — only with KMS vault + dual-control reveal + audit + MFA step-up; capability off by default.

### Still pending from owner
- ✅ **Retainer/service tiers** — RECEIVED (pricing deck). Captured in `service-packages.md`: STILLS £200 · ON AIR £460 · PRIME TIME £900 · HEADLINE £1,720 · OFF-SCRIPT bespoke, + add-ons. All plans customisable per client (`client_services` overrides). Seeds the M2 retainers module.
- **Aniro reminders**: finish/confirm the Aniro Meta app review (→ direct social publishing); scope the Aniro WhatsApp-inbox capability (brief written).

## External accounts to provision (for live M1+)
Neon · Clerk · Cloudflare R2 · Trigger.dev · Resend · Anthropic API key. I'll give exact setup steps when we wire them.

## Known issues / risks
- Long external-approval poles (Meta/TikTok app review, Google Business Profile allow-listing, WhatsApp business verification) all sit M5–M6 — start those applications early.
- Pay-runs & publishing are the highest-consequence paths — sandbox-first, approval-gated, last.

## Next steps
1. ✅ Cut `blanc-script-os` branch, OS at repo root, docs moved across.
2. ✅ Scaffold **Milestone 1** foundation — builds green on placeholders.
3. **Wire accounts:** you provision Neon (via Vercel integration) + Clerk + R2 → I wire the Clerk auth adapter, the Neon/Drizzle driver, migrations + RLS policies → verify sign-in and a first RLS-protected read.
4. Finish M1 (real auth + DB-backed profile/membership + RLS matrix tests), then begin Milestone 2.
