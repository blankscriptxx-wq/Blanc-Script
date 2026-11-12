# Overnight Build Log

Running log of what I did while you slept. Newest at the bottom.
Live preview: https://blanc-script-git-blanc-script-os-blankscriptxx-wqs-projects.vercel.app
(you'll pass Vercel's own login first, then Blanc Script sign-in.)

## Plan (priority order)
1. Security: application-level tenancy hardening + Neon RLS policies (defence in depth).
2. Shared DS kit: DataTable, Drawer/Sheet, Form fields, Kanban, Toast.
3. **Clients** module (CRM) — list, create, record drawer, notes — real data.
4. **Projects & Tasks** — list/board, create, assign.
5. **Team** — members, roles, capabilities (read).
6. **Calendar** — shoots/tasks/meetings.
7. **Command Centre (Today)** — wire real counts.
8. Push into **Production** (shoots/briefs) as far as safe.

Discipline: every commit builds green; marketing site never touched; no money/accounts/outward actions.

## Entries
- Started overnight run. Created this log + `OVERNIGHT_CHECKLIST.md`.
- **Clients module (M2) — DONE.** Org-scoped data layer (`lib/data/clients.ts`), create dialog, record drawer, live list. Verified end-to-end: added "Aura Skincare", persisted to Neon, listed. New reusable DS: `Dialog`, `Sheet`. Clients nav now live.
- Note on security: all queries are strictly org-scoped in the data layer (application-level tenancy) and go through a `requireUser()` gate. Full Neon RLS (authenticated-role + JWT) is flagged for review — see end of file.

## Security / RLS — decision & plan (researched via Neon docs)
**Current guarantee (enforced):** the app connects as the DB owner and enforces tenancy in the application layer — every data function goes through `requireUser()` and filters by `org_id` in the query. Neon's own RLS guide explicitly lists this (verify JWT/user server-side + scope every WHERE) as a valid approach. It is the security model in force now.

**Defence-in-depth upgrade (left as a REVIEWED task — not rushed overnight):** DB-enforced Neon RLS. Requires:
1. A custom Postgres login role WITHOUT `BYPASSRLS` (e.g. `authenticated_backend`) + GRANTs on our tables; a second `DATABASE_AUTHENTICATED_URL`.
2. Switch the user-facing data layer to `@neondatabase/serverless` Pool + `drizzle(neon-serverless)`, running each query in a transaction that does `set_config('request.jwt.claims', <verified claims>, true)` after verifying the Neon Auth JWT (jose + the project JWKS: .../neondb/auth/.well-known/jwks.json).
3. RLS policies per tenant table keyed on `org_id` + the membership/role, plus portal isolation for client_user/talent_user.
Why deferred: it needs the Neon Auth JWT surfaced from the session, a driver swap, and careful testing (two orgs, verify isolation) — safer with you awake. Checklist item added.

## Module build (parallel agents)
- Launched 3 build agents (Projects, Shoots, Team). Integrating each as it lands (mark nav live, build green, commit).
- **Projects, Shoots, Team modules — DONE** (built by 3 parallel agents, integrated + verified: team lists the owner, project create persists). Nav live for Clients/Projects/Shoots/Team.
- **Command Centre (Today) — wired to real counts**: Clients, Active projects, Upcoming shoots, Open tasks (live, org-scoped, count-up animated).
- **Schema expanded**: added `talent` + `invoices` tables (org-scoped, money as integer pence), generated migration `0001_mysterious_maestro.sql`, applied to Neon. Build green.
- **Talent module — DONE** (parallel agent, integrated): talent book — list, add (name/email/phone/rate per hour/status), record drawer. Rate shown £/hr from pence. Org-scoped via `requireUser`, writes activity_log. Nav `/talent` live.
- **Finance module — DONE** (parallel agent, integrated): invoices — 3 summary tiles (Outstanding £, Paid this month £, Overdue count, count-up animated), new-invoice dialog (client/number/amount £/status/due date), table with status pills (draft/sent/approved/paid/overdue), record drawer. Org-scoped, gated behind `can_see_money`. Nav `/finance` live.
- Modules now live on real data: Today, Clients, Projects, Shoots, Team, Talent, Finance. Remaining nav stubs: Edits, Content, Settings.
- Next: Edits (review/approvals) + Content (calendar/scheduling) modules, then Settings.
