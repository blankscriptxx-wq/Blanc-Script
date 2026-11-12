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
