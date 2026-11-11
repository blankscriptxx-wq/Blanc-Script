# Blanc Script OS — Architecture Decision Records (ADRs)

> **Status:** PLANNED (v0). Every decision below is a *planned* choice for Blanc Script OS,
> recorded now so the build and the other agents share one rationale. Several are **already
> locked** by `os/docs/_FOUNDATION.md`; those ADRs record *why* (and the honest trade-offs),
> they do not reopen the choice. Where a decision introduces something **outside** the locked
> stack, it is flagged **[NEEDS LEAD APPROVAL]**.
>
> Format: **Context → Decision → Consequences (incl. trade-offs & alternatives rejected).**
> Reference product: Centauri OS (`docs/centauri-crm-analysis.md`). We improve on it; we copy
> nothing. British English throughout.

**Index**

1. Overall architecture — App Router monolith on Vercel, decomposed best-of-breed services
2. Neon over Supabase
3. Relational (one table per entity) over single-table `records`
4. Clerk for auth, organisations & roles (incl. external portal users)
5. Neon Authorize + Postgres RLS as primary isolation; split capability enforcement
6. Drizzle ORM + Drizzle Kit
7. Cloudflare R2 for media with signed URLs
8. Trigger.dev for background jobs & schedules
9. Realtime via managed pub/sub behind an adapter (reject LISTEN/NOTIFY)
10. Resend for transactional email
11. Anthropic Claude AI layer — BYO-key, agentic, permission-bounded
12. Three surfaces as route groups in one app; single data-access layer
13. Server-first (RSC + Server Actions) through one audited DAL (our `write_record`)
14. Tenant-safe caching; optional edge KV for rate-limit/idempotency
15. Single repo now, Turborepo extraction later
16. Frame.io adapter with a Cloudflare Stream fallback to evaluate
17. PWA with a deliberately narrow offline posture
18. Observability: Sentry + `activity_log` + Vercel insights
19. Ports-and-adapters for every third-party integration
20. Money, time, soft-delete & identifier conventions

---

## ADR-001 — Overall architecture: App Router monolith on Vercel, decomposed services
**Status:** Accepted (locked by foundation §1).
**Context.** We need a real, secure, multi-user agency OS spanning CRM → production →
post → content → finance → portals → AI. Centauri proved the domain with a React SPA on
Vercel over an all-in-one Supabase backend. The foundation locks Next.js (App Router) on
Vercel, with specialist providers for each concern.
**Decision.** Build **one Next.js App Router application** (server-first) deployed on Vercel,
composed of **best-of-breed services** — Neon (DB), Clerk (auth), R2 (media), Trigger.dev
(jobs), Resend (email), Anthropic (AI) — each behind an adapter, with three UI surfaces as
route groups over one database.
**Consequences.**
- (+) Server-rendered, SEO-irrelevant-but-fast, secure-by-default (secrets stay server-side,
  unlike Centauri's public-anon-key SPA where *all* security is RLS).
- (+) Each concern uses the strongest specialist; no single-vendor ceiling.
- (−) More vendors to wire and more glue than Supabase's bundle; mitigated by adapters and
  one DAL.
- Rejected: a client-only SPA (loses server-side secret custody and RSC data-fetch);
  a bundled single-vendor backend (see ADR-002).

## ADR-002 — Neon over Supabase
**Status:** Accepted (locked by foundation §1).
**Context.** Centauri runs on Supabase (Postgres + Auth + Realtime + Storage + Edge
Functions). We deliberately chose a decomposed stack with Neon as the database.
**Decision.** Use **Neon** (serverless Postgres) as the database, and take Auth, Storage,
Jobs, Realtime and Email from specialist providers rather than one bundle.
**Consequences.**
- (+) **Branch-per-preview**: Neon can fork the whole database per PR, so migrations and RLS
  are tested on an isolated copy before merge — Centauri's single Supabase project cannot.
- (+) **Scale-to-zero / serverless** billing and autoscaling suit spiky agency usage.
- (+) **No lock-in to bundled Auth/Storage**: we pick Clerk (stronger B2B orgs/roles than
  Supabase Auth) and R2 (zero-egress media, ADR-007).
- (+) Clean fit with Drizzle + a per-request authenticated connection for RLS.
- (−) We must integrate Realtime, Storage, Auth and Jobs ourselves (ADR-004/007/008/009) —
  more moving parts than Supabase's one dashboard.
- (−) Neon's serverless model constrains `LISTEN/NOTIFY` (ADR-009).
- Rejected: Supabase (bundling convenience outweighed by branching, specialist quality, and
  avoiding a monolithic vendor); self-hosted Postgres (ops burden).

## ADR-003 — Relational (one table per entity) over single-table `records`
**Status:** Accepted (locked by foundation §4).
**Context.** Centauri models ~130 object types as rows in one generic **`records`** table
keyed by a `kind` field, with writes funnelled through a `write_record` Edge Function. It is
flexible and fast to iterate, but it is a document store wearing Postgres's clothes.
**Decision.** Use a **normalised relational model — one table per core entity** (foundation
§4: `organisations`, `users`, `memberships`, `companies`, `contacts`, `clients`, `leads`,
`projects`, `tasks`, `shoots`, `media_assets`, `edits`, `reviews`, `invoices`, `talent`,
`talent_payments`, `activity_log`, `ai_threads`/`ai_messages`, …). Use **JSONB only** for
genuinely variable metadata (per-platform post payloads, integration blobs).
**Consequences.**
- (+) Real **foreign keys, typed columns, constraints, and efficient per-entity indexes**;
  queries read clearly; **per-entity RLS** is precise (a single mixed table forces coarse,
  error-prone policies).
- (+) Typed Drizzle migrations give a reviewable schema history.
- (+) We *keep Centauri's good instincts* without the coupling: one audited write path (the
  DAL, ADR-013), a cross-entity "Today"/`notifications` feed assembled by query, and JSONB
  for the genuinely-variable bits.
- (−) More tables and more migrations; less runtime "just add a kind" flexibility. Acceptable
  because we already know the domain (reverse-engineered) and value integrity over improvisation.
- Rejected: the single `records`/`kind` pattern (loses integrity, indexing, and clean RLS).

## ADR-004 — Clerk for authentication, organisations & roles
**Status:** Accepted (locked by foundation §1).
**Context.** We need multi-user auth with **organisations + roles**, hosted sign-in UI, and —
crucially — a JWT the database can trust for RLS. We also need strongly-isolated **external**
users (client_user, talent_user) for the two portals.
**Decision.** Use **Clerk**. Staff belong to the Blanc Script **organisation** with roles
(owner, ops/admin, account_manager, editor, filmer). External portal users are Clerk users
carrying a **`portal_scope`** claim (`client:<id>` / `talent:<id>`) and linked via
`memberships` to exactly one client/talent entity. The `users` table **mirrors** Clerk via
webhooks (foundation §4).
**Consequences.**
- (+) Strong B2B org/role model, MFA, session management, and a JWT template that feeds Neon
  Authorize (ADR-005) out of the box.
- (+) Portal users isolated by claim + RLS without standing up our own auth.
- (−) Vendor lock for identity; must mirror users into Postgres and keep them in sync (webhook
  + reconciliation job).
- (−) **Open question:** best Clerk modelling for external users (flagged users vs separate
  orgs) — **Security agent owns**; affects RLS and claims. **[FLAG]**
- Rejected: Supabase Auth (weaker B2B orgs; and we left Supabase), rolling our own (risk).

## ADR-005 — Neon Authorize + Postgres RLS as primary isolation; split capability enforcement
**Status:** Accepted (locked by foundation §1, §3; mechanism planned here).
**Context.** Isolation must survive application bugs. Capabilities are fine-grained and
**individually overridable** (foundation §3), which conflicts with baking them all into a JWT.
**Decision.** **RLS on every tenant-scoped table** is the primary isolation mechanism. Clerk
issues a JWT that **Neon Authorize** validates on each connection (role `authenticated`),
exposing `auth.user_id()`/`auth.jwt()`. The JWT carries **identity only** (`sub`, `org_id`,
`org_role`, `portal_scope`). **Coarse** isolation/role comes from the token in-policy; **fine,
money-sensitive capabilities** (`can_see_money`, `can_see_actor_pay`, `can_invoice`,
`can_pay_team`, `can_approve_pay`) are enforced by RLS policies that **join `memberships`**
for live flags, mirrored by `guards.ts` in the DAL for clear errors. Privileged jobs use a
narrow server-only service role (no browser request path).
**Consequences.**
- (+) A missing `where org_id` in app code still cannot leak cross-tenant rows.
- (+) Revoking a capability takes effect **immediately** (read live from the DB), not at
  token expiry; tokens stay small.
- (−) Capability-bearing policies **join `memberships`** on hot paths — a modest cost; indexed
  and cache-friendly, but the DB agent must design it (RLS policy SQL + indexes). **[FLAG]**
- (−) Two enforcement sites (RLS + DAL guard) must agree — tested together (QA).
- Rejected: capabilities-in-JWT (stale on revoke, bloated); app-only checks (no DB backstop).

## ADR-006 — Drizzle ORM + Drizzle Kit
**Status:** Accepted (locked by foundation §1).
**Context.** We need a type-safe data layer that works with Neon's serverless driver and lets
us attach a **per-request authenticated connection** for RLS, with reviewable migrations.
**Decision.** Use **Drizzle ORM** (schema-as-TypeScript, SQL-first) and **Drizzle Kit** for
migrations; define RLS policies alongside the schema.
**Consequences.**
- (+) First-class fit for passing a per-request Clerk-authenticated Neon connection; thin
  runtime; SQL stays legible; migrations are plain, reviewable files (good with Neon branches).
- (+) Shared types across server, actions, and the AI tool schemas.
- (−) Smaller ecosystem/tooling than Prisma; more hand-written SQL for complex queries.
- Rejected: Prisma (historically heavier serverless/connection story and awkward per-request
  RLS token handling); raw SQL only (loses type safety).

## ADR-007 — Cloudflare R2 for media with signed URLs
**Status:** Accepted (locked by foundation §1).
**Context.** A video/photo agency moves large files repeatedly; **egress** dominates media
cost. Client media must never sit in public buckets.
**Decision.** Store all media in **private Cloudflare R2** buckets (S3-compatible). Browsers
get **short-TTL signed URLs** minted server-side after a capability check; large footage uses
**multipart** uploads straight to R2 (never through Vercel). Keys namespaced by `org_id`.
**Consequences.**
- (+) **Zero egress fees** — decisive for delivering/reviewing video at scale.
- (+) Big uploads bypass our functions (no body-size/time limits); resumable on set.
- (+) `media_assets` + RLS decide whether a signature is minted at all → tenant-safe.
- (−) R2 has **no built-in image/video transforms**; need Cloudflare Images / a Worker / a
  Trigger.dev job for thumbnails and responsive sizes. **[FLAG — ADR-016 / Lead]**
- (−) Some S3 feature/behaviour differences to account for in the adapter.
- Rejected: S3 (egress cost), Supabase Storage (left Supabase; egress), public buckets (unsafe).

## ADR-008 — Trigger.dev for background jobs & schedules
**Status:** Accepted (locked by foundation §1).
**Context.** We need durable, long-running, retryable work and cron: integration syncs,
scheduled social publishing, digests, media post-processing, pay-runs — beyond Vercel function
timeouts. Centauri used Supabase scheduled functions (xero-sync-hourly, social-publish-every-
5-min, etc.).
**Decision.** Use **Trigger.dev** for all background jobs and schedules; jobs call back
**through the DAL service path** (never raw SQL), write to `activity_log`, and emit realtime/
notification events like a Server Action.
**Consequences.**
- (+) Durable multi-step workflows, retries, concurrency control, long execution, and a run
  dashboard — well beyond Edge Function limits.
- (+) Clean separation of "do it now" (Server Action) vs "do it durably/later" (job).
- (−) Another vendor + cost; cold starts; jobs must be **idempotent** (we use idempotency keys,
  especially for publishing and pay-runs).
- Rejected: Vercel Cron + QStash alone (shorter runs, less workflow structure); in-request work
  (times out, no retries).

## ADR-009 — Realtime via managed pub/sub behind an adapter; reject LISTEN/NOTIFY
**Status:** Proposed **[NEEDS LEAD APPROVAL — vendor not in locked stack]**.
**Context.** Chat, notifications, presence, and live status are first-class (as in Centauri,
which used Supabase Realtime over WebSockets). **But** Neon is serverless and Vercel functions
are short-lived, so Postgres `LISTEN/NOTIFY` — which needs a persistently held connection — is
a poor fit, and the pooled endpoint does not support it.
**Decision.** Define a **`RealtimeAdapter`** with two implementations: **primary = managed
pub/sub (Ably proposed; Pusher equivalent)**, **fallback = SSE + short polling** from our own
routes. Writes are **DB-first**; after a successful RLS-checked write we **publish** an event
to an **org/role/portal-scoped** channel. Subscribers authenticate with a **short-lived token**
from `/api/realtime/token` that re-runs the capability check (a client_user can only subscribe
to their own client's channels). The DB stays the source of truth; realtime is a notification
layer.
**Consequences.**
- (+) Purpose-built fan-out, presence, and history **off** our serverless infra; scales without
  holding connections open on Vercel.
- (+) Adapter means modules are agnostic; MVP can ship **SSE/polling only** with identical event
  shapes if the Lead defers the vendor.
- (−) **Ably/Pusher is a new dependency not named in foundation §1** — explicit Lead approval
  required, or we stay SSE/polling for M1–M4 (chat lands later). **[FLAG]**
- (−) SSE fallback holds a function open and is chattier; fine at early scale.
- Rejected: `LISTEN/NOTIFY` from Vercel (needs an always-on worker — avoid that moving part);
  a dedicated always-on realtime server (ops burden we don't want yet).

## ADR-010 — Resend for transactional email
**Status:** Accepted (locked by foundation §1).
**Context.** We need reliable transactional email (portal invites, digests, invoice chases,
notifications) with good deliverability and a React-friendly templating story.
**Decision.** Use **Resend** behind an `Email` adapter; send from Server Actions and Trigger.dev
jobs; templates in React Email.
**Consequences.** (+) Simple API, React templates, good deliverability, verified-domain prod
flow. (−) Vendor; must manage domain verification/DKIM per environment. Rejected: SES (rougher
DX), SMTP-only (deliverability/ops).

## ADR-011 — Anthropic Claude AI layer: BYO-key, agentic, permission-bounded
**Status:** Accepted (locked by foundation §1, §3).
**Context.** System J is a core differentiator. Centauri shipped an **agentic** Claude with a
real tool catalogue (tools declaring an execution `mode`, a `may:` guard, and an input schema),
BYO Anthropic key, Haiku for routine work. We must do this *safely* and *better*.
**Decision.** A **server-only** AI layer: **BYO Anthropic key per org** (encrypted in
`integrations`), **model routing** (Haiku classify/routine, Sonnet/Opus reasoning), persistence
to `ai_threads`/`ai_messages`, usage/budget tracking. Tools declare **mode** (`popup`/`direct`/
`ask`) + **capability guard** + **Zod schema**, and **execute through the same DAL + RLS** as a
human. The AI acts strictly **within the caller's role + capabilities** and never does a
consequential action without permission **and** confirmation (foundation §3).
**Consequences.**
- (+) The AI can never exceed the person using it (same guards, same RLS, same audit).
- (+) Cost control via routing + budgets; keys never reach the client.
- (−) Tool catalogue must be maintained in lockstep with capabilities; `ask`-mode UX needed for
  consequential tools (pay, invoice-paid, send-message).
- (−) BYO-key means per-org onboarding friction (acceptable; matches Centauri's opt-in model).
- Rejected: a non-agentic chatbot (loses the workflow value); client-side keys (insecure);
  letting the AI bypass guards for convenience (unacceptable).

## ADR-012 — Three surfaces as route groups in one app; single data-access layer
**Status:** Accepted (consistent with foundation §5/§6).
**Context.** Staff app shell, client portal, and talent portal must be **strongly isolated**
(foundation §3) yet share one database and most infrastructure. Centauri used separate
subdomains (`crm.`, `client.`, `actor.`) over one backend.
**Decision.** Implement all three as **route groups** — `(app)`, `(client-portal)`,
`(talent-portal)` — in **one** Next.js app, each with its own layout and middleware gate, over
**one** DAL and database. Optionally surface them on **subdomains** via host-based rewrites in
`middleware.ts` for a Centauri-like split without a second codebase.
**Consequences.**
- (+) One deploy, one DAL, one design system; isolation enforced by middleware gates **and**
  RLS/`portal_scope`.
- (+) Can later promote a portal to its own deployment (ADR-015) with minimal change.
- (−) Shared deploy = larger blast radius; mitigated by route-group isolation, separate gates,
  and portal-scoped RLS. **Subdomain-vs-single-domain is a Lead/infra call. [FLAG]**
- Rejected: three separate apps now (premature; triples infra before product exists).

## ADR-013 — Server-first (RSC + Server Actions) through one audited DAL
**Status:** Accepted (consistent with foundation §2).
**Context.** Centauri centralised writes through a single `write_record` Edge Function for
validation, permissions, and audit — a genuinely good instinct, coupled to their single table.
**Decision.** Keep the **discipline, drop the coupling**: reads via **Server Components**,
mutations via **Server Actions/Route Handlers**, all flowing through **one Data-Access Layer**
(`data-access/`) that is the **only** place an authenticated DB connection is built. Each
mutation runs **capability guard → typed repository write (under RLS) → `activity_log` →
`revalidateTag` → emit event**. No client code ever reaches the database.
**Consequences.**
- (+) One audited, guarded, typed write path **per entity** (not one generic blob), so audit,
  validation, and permissions are consistent and testable.
- (+) Clear server/client boundary; secrets stay server-side by construction.
- (−) Developers must resist back-door queries; enforced by lint boundaries + code review.
- Rejected: direct DB access from components/actions scattered across the app (no single audit
  point); a literal single `write_record` (recreates the single-table coupling).

## ADR-014 — Tenant-safe caching; optional edge KV for rate-limit/idempotency
**Status:** Partly accepted; **edge KV [NEEDS LEAD APPROVAL]**.
**Context.** RLS multi-tenancy makes caching a correctness risk: shared caches can leak across
tenants. We also need rate limiting and idempotency (publishing, pay-runs, webhooks).
**Decision.** Tenant reads are **dynamic/request-scoped**; expensive derived reads use
`unstable_cache` **tagged by `org_id`** and invalidated by the mutating action; per-request
dedupe via React `cache()`. Only static/public/org-shared-non-sensitive data is CDN-cached;
private media is never CDN-cached (short-TTL signed URLs). **Optionally** add **Upstash Redis /
Vercel KV** (behind an adapter) for rate limiting, idempotency keys, and realtime fan-out dedupe.
**Consequences.** (+) No cross-tenant cache leakage; precise invalidation. (−) Less aggressive
caching of tenant data (correctness over speed). (−) **Edge KV is outside the locked stack —
approve or defer. [FLAG]** Rejected: caching tenant rows in the shared Data Cache untagged
(leak risk).

## ADR-015 — Single repo now, Turborepo extraction later
**Status:** Accepted (consistent with foundation §2's package/dir language).
**Context.** Foundation calls for a feature-module structure with a shared design-system
package/dir, and asks for an extraction plan. A full Turborepo monorepo now would add overhead
before the product exists.
**Decision.** Start as **one repository, one Next.js app** with **internal package boundaries**:
`design-system/` (`@blancscript/ui`), `db/` (`@blancscript/db`), `data-access/`, and
`modules/*`, with dependency direction enforced by lint. **Planned extraction:** when a second
runtime surface genuinely needs shared code (e.g. a portal promoted to its own deployment, or a
mobile/field app), **promote these dirs into a pnpm + Turborepo workspace** (`packages/ui`,
`packages/db`, `packages/core`) with the app(s) as `apps/*`.
**Consequences.** (+) No monorepo tax today; clean seams make later extraction mechanical.
(−) Must police boundaries now (lint) so extraction stays cheap. Rejected: Turborepo from day
one (premature); a tangled single `src` with no boundaries (extraction becomes a rewrite).

## ADR-016 — Frame.io adapter with a Cloudflare Stream fallback to evaluate
**Status:** Accepted direction; **provider still to evaluate (per foundation §1)**.
**Context.** Clients review and approve edits; Centauri integrated Frame.io (client portal
allowed `*.frame.io`/`*.cloudfront.net`). Foundation locks a **Frame.io adapter** with a
**Cloudflare Stream fallback path to evaluate**.
**Decision.** Define a **`VideoReview`/`VideoDelivery` adapter**; implement **Frame.io** first;
keep an alternative implementation path on **Cloudflare Stream** (native with R2) to evaluate
for hosted playback/review where Frame.io is overkill. Review state maps onto `reviews`/
`revisions`/`approvals`.
**Consequences.** (+) Pro review tooling now, provider swap later without touching modules.
(−) Two candidate back-ends to reason about; **transforms/playback for R2-hosted media overlaps
with ADR-007's transform gap. [FLAG — Lead/Integrations to pick the review+playback combo.]**
Rejected: building our own review tool (waste); hard-wiring Frame.io (no exit).

## ADR-017 — PWA with a deliberately narrow offline posture
**Status:** Accepted (consistent with foundation §1 "installable PWA").
**Context.** Centauri is an installable PWA with shortcuts (Today, My shoots, Calendar, Chat).
Field crews shoot where signal is poor. But the data is multi-tenant, RLS-gated, and includes
money, pay, and stored client logins.
**Decision.** Ship an **installable PWA** (Serwist/`next-pwa`, manifest, shortcuts, Web Push).
**Offline is intentionally narrow:** cache the app shell + recently-viewed reads (read-only,
clearly labelled); **queue-and-retry** a small, safe set of **on-set** actions (mark cast
turned-up, add a quick task, battery-charge task) with idempotency keys; **resumable** R2
uploads. **No offline writes** to money, pay, approvals, or permissions; **no** full offline
tenant replication on devices.
**Consequences.** (+) Genuine on-shoot usefulness without unencrypted tenant data on devices.
(−) Not a full offline app — a conscious security/consistency trade-off. Rejected: full offline
replication (unacceptable data-at-rest and consistency risk for a money system).

## ADR-018 — Observability: Sentry + `activity_log` + Vercel insights
**Status:** Proposed **[Sentry NEEDS LEAD APPROVAL — not in locked stack]**.
**Context.** We need technical telemetry separate from business audit. Centauri shipped a
client error-reporting endpoint.
**Decision.** **Sentry** for errors/traces (and optional replay) across server/client, with
correlation ids request → action → job; Vercel Analytics/Speed Insights, Trigger.dev dashboard,
Neon metrics, Clerk logs for platform insight; a client error-report endpoint; and
**`activity_log`** as the distinct, user-visible **business audit** written in-txn by the DAL.
**Consequences.** (+) Clear split between "what broke" (Sentry) and "who did what" (activity_log);
fast incident triage. (−) **Sentry is outside the locked stack — approve or substitute. [FLAG]**
Rejected: logs-only (no tracing/grouping); conflating audit with error telemetry.

## ADR-019 — Ports-and-adapters for every third-party integration
**Status:** Accepted (locked by foundation §1: "every integration sits behind an adapter").
**Context.** The agency domain is integration-heavy (Centauri wired Xero, TikTok/Meta/Metricool,
Frame.io, Revolut, WhatsApp/Periskope, Google/Drive, Anthropic). Providers fail, change, or get
swapped.
**Decision.** Every external provider sits behind a **typed adapter interface** in
`lib/adapters/*` (`MediaStorage`, `Email`, `RealtimeAdapter`, `VideoReview`, `Accounting`,
`SocialPublisher`, `PaymentRail`, `Messaging`, `Drive`, `AiProvider`). Modules depend on the
**interface**, per-org connection state lives in `integrations`, and an adapter that is down
fails gracefully so the app still runs (foundation §1). Integration specifics are owned by the
Integrations agent (`INTEGRATIONS_ROADMAP.md`); this ADR fixes only the pattern.
**Consequences.** (+) Testable (mock adapters), swappable, resilient; graceful degradation.
(−) Upfront interface design + a thin indirection layer. Rejected: calling SDKs directly from
modules (brittle, untestable, no graceful degradation).

## ADR-020 — Money, time, soft-delete & identifier conventions
**Status:** Accepted (locked by foundation §2).
**Context.** A UK finance-bearing system must be exact about money, time, deletion, and naming;
these cut across every module and must be stated once.
**Decision.** Follow foundation §2 verbatim: **money as integer minor units (pence) + ISO
currency**, never floats, **UK VAT-aware**; **all times `timestamptz` in UTC**, displayed in
**Europe/London**; **soft-delete via `archived_at`**, hard-delete only through the explicit GDPR
erasure path; **UUID PKs** (`gen_random_uuid()`); DB `snake_case`, TS `camelCase`, components
`PascalCase`; every tenant table has `org_id` + `created_at`/`updated_at` + RLS.
**Consequences.** (+) No rounding/timezone/VAT bugs; consistent, auditable records; GDPR-ready
erasure distinct from everyday archive. (−) Formatting/VAT helpers and a disciplined erasure
path must exist from M1. Rejected: floats for money, local-time storage, physical deletes as the
default (each a well-known source of defects).

---

### Cross-cutting flags for the Lead to resolve
- **New dependencies beyond the locked stack:** realtime vendor (ADR-009), edge KV
  (ADR-014), Sentry (ADR-018). Approve, substitute, or defer each.
- **RLS capability policy design** (ADR-005) — DB + Security agents to finalise the
  `memberships`-join policy SQL and indexes.
- **External portal-user modelling in Clerk** (ADR-004) — Security agent.
- **Media transforms + review/playback provider** (ADR-007, ADR-016) — Integrations/Lead.
- **Subdomain-per-surface vs single-domain** (ADR-012) — product/infra.
```
