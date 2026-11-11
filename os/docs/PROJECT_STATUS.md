# Blanc Script OS — Project Status

**Updated:** 11 Nov 2026
**Phase:** Planning complete → ready to start Milestone 1
**Location:** `os/` on branch `claude/amazing-albattani-rpbm9f` (planning). To be restructured onto a dedicated `blanc-script-os` branch with the OS at repo root (see Next steps). Isolated from the marketing site; live site untouched.

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

## Open decisions — need your input (none block Milestone 1)
1. **Retainer/service-plan tiers** — names, prices, and each tier's monthly playbook (your business data; needed to seed real data from M2).
2. **Video provider** (M4): Cloudflare Stream [rec] vs Frame.io.
3. **Social approach** (M5): Metricool [rec] vs direct platform APIs.
4. **Payout rail** (M6): Revolut [rec if you have Business] vs Stripe.
5. **WhatsApp** (M6): Periskope [rec] vs Cloud API only.
6. Confirm **deferring stored-client-logins** out of v1 [rec: yes].

## External accounts to provision (for live M1+)
Neon · Clerk · Cloudflare R2 · Trigger.dev · Resend · Anthropic API key. I'll give exact setup steps when we wire them.

## Known issues / risks
- Long external-approval poles (Meta/TikTok app review, Google Business Profile allow-listing, WhatsApp business verification) all sit M5–M6 — start those applications early.
- Pay-runs & publishing are the highest-consequence paths — sandbox-first, approval-gated, last.

## Next steps
1. Cut `blanc-script-os` branch, OS at repo root, move docs across.
2. Scaffold **Milestone 1** (app shell, auth, Drizzle schema + RLS helpers, design tokens + core components, nav, PWA) — builds green on placeholders.
3. You provision Neon + Clerk + R2 → wire live → verify auth + a first RLS-protected read.
4. Begin Milestone 2 once the foundation is stable.
