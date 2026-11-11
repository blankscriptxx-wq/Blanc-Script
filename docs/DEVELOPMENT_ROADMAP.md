# Blanc Script OS — Development Roadmap

**Status:** Planning complete (v0). This roadmap is lead-owned and reconciles all specialist docs.
**Branch strategy:** OS lives on its own branch `blanc-script-os` in this repo, at the repo root, isolated from the marketing-site branches. Nothing here deploys the marketing site.

---

## Lead reconciliation decisions (ratified)
These resolve the conflicts/open points raised by the specialist agents. Deferred items are mapped to the milestone where they're actually needed, with a recommendation, so **none block Milestone 1**.

| # | Decision | Ruling | Source conflict |
|---|---|---|---|
| D1 | **Realtime** | Use **Neon Realtime** (enabled on the project via Vercel Storage) behind a `RealtimePort`, with SSE/short-poll as fallback. No separate pub/sub provider (Ably/Pusher) needed — superseded by Neon Realtime (owner confirmed 11 Nov). | Arch ADR-009 |
| D2 | **Observability** | Vercel logs + structured logging + `activity_log` for M1–M2; add Sentry at M2/M3. | Arch ADR-018 |
| D3 | **Rate limit / KV** | Add Upstash Redis (or Vercel KV) when public/webhook endpoints appear (M4+). Not in M1. | Arch ADR-014 |
| D4 | **Portal identity** | Single Clerk app; external users carry a `portal_scope` claim; isolation via `memberships.client_id/talent_id` + RLS. | Security #1, Arch #4 |
| D5 | **Capabilities source of truth** | `memberships.capabilities` (effective booleans); RLS reads via helper join; JWT carries identity/org/role (+ optional caps array for convenience only). | DB/Arch cap question |
| D6 | **Stored client logins** | **In v1 scope** (owner's call, 11 Nov) — but shipped **only with** the full scaffold: KMS envelope encryption (never plain DB), dual-control reveal, append-only audit, MFA step-up on reveal, `can_manage_client_logins` off by default. No raw-credential storage without these. Prefer OAuth where the platform offers it. | Security #2 |
| D7 | **Google scope** | Least-privilege `drive.file`. | Integrations #6 |
| D8 | **Email** | Single app-level Resend key for v1; per-org white-label later. | Integrations #5 |
| D9 | **can_see_money vs can_see_margin** | Split: `can_see_money` (revenue/invoices) separate from `can_see_margin` (cost/profit). Ops gets money, not margin, by default. | Security #5 |
| D10 | **Separation of duties** | Hard-block holding both `can_pay_team` and `can_approve_pay` by default (configurable by owner). | Security #3 |
| D11 | **"Two shoots, one day = one shoot day"** | Per-org setting, default ON. | Product #6 |
| D12 | **Client content approval** | Clients approve `edits` in M4; `content_items` approval in M5. | DB #2 |
| D13 | **Money/pay masking** | DB defines sensitive-column set; Security's capability matrix governs who sees each; one reconciled masking matrix enforced in the DAL, rows via RLS. | DB #1 |
| D14 | **Design defaults** | Mono = Geist Mono; WCAG 2.2 AA (stronger on auth/finance); default density **comfortable** + compact toggle; charts = **Recharts**; AI panel = side-panel desktop / sheet on tablet+mobile; warm near-white canvas, cream as restricted accent. | Design §13 |

### Provider decisions — RESOLVED (owner, 11 Nov 2026)
- **Video review/delivery** (M4): **Frame.io** via `VideoReviewPort`. Frame-accurate client review + versioning; needs a Frame.io/Adobe account.
- **Social publishing** (M5): **Metricool** via `SocialPort` for v1. **Later: direct Meta publishing through Aniro AI's existing (app-reviewed) Meta app** — integrate straight in once the Aniro-side review is finished. See "Cross-business" below.
- **Payouts** (M6): **Monzo Business** — Monzo has **no payouts API**, so the OS prepares the pay-run (calculate → approve → audit) and **exports a bank-ready payment file** for manual upload in Monzo. Money only moves with a human in the bank. `PayoutPort` kept abstract so an automated rail (Revolut/Wise/Stripe) can be added later.
- **WhatsApp** (M6): **Periskope** via `MessagingPort` for v1 (supports groups). **Later: build on Aniro AI's existing WhatsApp inbox integration** — see the Aniro brief (`docs/aniro-whatsapp-integration-brief.md`).
- **Stored client logins**: in v1 scope with the full security scaffold (see D6).
- **Retainer/service tiers** (seed from M2): owner is supplying the **real tiers** (names · £/month · inclusions). Build uses them once provided; until then the retainers module is scaffolded without seeded tiers. **PENDING owner input.**

### Cross-business (Aniro AI)
Aniro AI is the owner's other business and already holds assets Blanc Script OS can reuse:
- **Meta app (app review complete)** → the path to direct social publishing (reminder: finish/confirm the Aniro Meta review, then integrate directly, superseding Metricool for Meta).
- **WhatsApp inbox integration** → basis for a shared messaging capability; spec in `docs/aniro-whatsapp-integration-brief.md`.

---

## Milestones

### M1 — Core Foundation
App shell · Clerk auth · Neon connection + Drizzle · base schema & RLS helpers · user/profile/membership · capability resolver · navigation · design system (tokens + core shadcn components) · responsive layout · PWA base.
**Can be scaffolded without live accounts** (env placeholders, builds green); goes live once you provide Neon + Clerk + R2 keys.
**Done means:** app builds and runs; a signed-in user lands in an app shell; the design system and command-palette shell exist; schema migrations + RLS helpers defined; RLS matrix test harness stubbed.

### M2 — Core Operations
Command Centre (Today) · Clients/Companies/Contacts · Leads & pipeline · Projects · Tasks · Calendar · Team management · Global search (⌘K). Service-plan templating scaffold (seed stub tiers). **Connected to real data.**
**Done means:** full CRUD with validation, loading/empty/error states, permissions, responsive, and RLS/permission tests green for each entity.

### M3 — Production Studio
Shoots · briefs · shot lists · running orders · call sheets · crew assignments · locations · equipment · schedules.

### M4 — Post-production + Client Portal
Footage handover · media (R2) · editor assignments + capacity/edit-clocks · reviews/revisions · **client edit approvals** · deliveries. **Client portal** (isolated). Video provider decision (D-video).

### M5 — Finance + Content/Social
Quotes/proposals · invoices + Xero sync · expenses · retainers · VAT · profitability. Content calendar · content pipeline · publishing · post-to-edit matching · analytics. Content-item approvals. Social provider decision (D-social).

### M6 — Intelligence + Automation + Remaining Integrations
Blanc Script AI (agentic, permission-gated tools; proactive attention digest) · Trigger.dev schedules/webhooks/automations · notifications · advanced reporting · WhatsApp · talent pay-runs (Revolut/Stripe, sandbox→live, approval-gated).

---

## Sequencing principles
- Security (RLS) and the capability model are built **in M1 and tested continuously**, not bolted on.
- Every integration sits behind a port/adapter with a `NullAdapter`, so the app runs if a provider is absent.
- Pay-runs and publishing are the strictest idempotency/consequence boundaries and come last, sandbox-first.
- The AI layer only ever acts *as* the current user, through the same DAL + RLS + capability guards.

## External accounts to provision (for live M1+)
Neon · Clerk · Cloudflare R2 · Trigger.dev · Resend · Anthropic API key. (No new GitHub repo needed — we're using the `blanc-script-os` branch.)
