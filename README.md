# Blanc Script OS

A premium operating system for a creative video & photo production + social-media agency — CRM, projects & tasks, production, post-production, content/social, finance, team & talent, client and talent portals, and an AI intelligence layer.

> This branch (`blanc-script-os`) is a **separate product** from the Blanc Script marketing website, which lives on its own branches in this repository. They do not share code or deploys.

## Status
**Planning complete.** Implementation starts at Milestone 1. See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

## Documentation (`/docs`)
- `PROJECT_STATUS.md` — where things stand, open decisions, next steps
- `DEVELOPMENT_ROADMAP.md` — milestones M1–M6 + ratified reconciliation decisions
- `_FOUNDATION.md` — locked stack, conventions, data-model spine
- `PRODUCT_VISION.md`, `PRODUCT_REQUIREMENTS.md`
- `SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md`
- `DATABASE_SCHEMA.md`, `MODULE_ARCHITECTURE.md`
- `DESIGN_SYSTEM.md`
- `USER_ROLES_AND_PERMISSIONS.md`, `SECURITY_AND_PRIVACY.md`
- `INTEGRATIONS_ROADMAP.md`
- `TESTING_STRATEGY.md`
- `AGENT_RESPONSIBILITIES.md`
- `centauri-crm-analysis.md` — reference-product analysis (public surface only)

## Stack
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Neon Postgres · Drizzle ORM · Postgres RLS · Clerk (→ Neon Authorize) · Cloudflare R2 · Trigger.dev · Resend · Anthropic Claude · Vercel · PWA.
