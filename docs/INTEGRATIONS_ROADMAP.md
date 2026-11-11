# Blanc Script OS — Integrations & Automation Roadmap

**Status:** Planned (v0). No integration below is implemented yet.
**Owner:** Integrations & Automation Architect.
**Consumes:** `os/docs/_FOUNDATION.md` (locked stack, conventions, milestones) and `docs/centauri-crm-analysis.md` (integration surface area). This document does **not** define the database schema or the stack — it consumes them. Where it names columns, it is describing *usage* of tables the DB agent owns (`integrations`, `activity_log`, `notifications`, `media_assets`, `invoices`, `social_posts`, `post_metrics`, `talent_payments`, `ai_threads`/`ai_messages`), not redefining them.

British English throughout. All money is integer minor units (pence) + ISO currency; all times UTC `timestamptz`, displayed Europe/London.

---

## 1. Principles (non-negotiable, from the Foundation)

1. **Every provider sits behind a modular adapter.** The application core never imports a vendor SDK directly. It depends on a local interface (a port); each provider is an adapter implementing that port. Swapping Frame.io for Cloudflare Stream, or Metricool for direct Graph APIs, is a new adapter — not a change to feature code.
2. **Graceful degradation is a foundation requirement.** If a provider is down, unauthorised, rate-limited, or not yet connected for an org, the feature must still render. Reads fall back to the last cached value in our own tables with a visible "last synced" timestamp; writes queue (via Trigger.dev) and surface a "pending" state. No dead buttons, no fake data, no uncaught 500s.
3. **Secrets are per-org, encrypted, server-side only.** Every connection's tokens/keys live as ciphertext in the per-org `integrations` table (one row per org per provider), encrypted at the application layer with a server-held key (envelope encryption; data-encryption key wrapped by a KMS/root key in Vercel env). RLS scopes rows to the org. Tokens are **never** sent to the client, never in a public env var, never logged. The browser only ever sees connection *status* (connected / needs reauth / disconnected) and non-secret display metadata.
4. **Adapters are capability- and permission-aware.** Any consequential action (send a message, mark an invoice paid, execute a pay-run, publish a post) is gated by the acting user's role + capability flags (`can_invoice`, `can_pay_team`, etc.) and, for AI-initiated actions, an explicit confirmation step. The adapter is the last line, not the only line.
5. **Idempotency and auditability everywhere.** Every outbound side-effecting call carries an idempotency key; every inbound webhook is verified, de-duplicated, and written to `activity_log`. External provider IDs are stored next to our own UUIDs so we can reconcile without double-acting.

### 1.1 The adapter interface shape (one pattern, all providers)

Each integration is a TypeScript module exposing a small, provider-neutral port. Illustrative shape (planned):

```ts
interface IntegrationAdapter<TConfig, THealth> {
  readonly provider: string;                 // 'xero' | 'frameio' | ...
  readonly capabilities: string[];           // e.g. ['invoices.read','payrun.export']
  isConfigured(orgId: string): Promise<boolean>;
  health(orgId: string): Promise<THealth>;   // up | degraded | down | needs_reauth
  // reads return cached-on-failure with a `stale` flag + `lastSyncedAt`
}

// Domain ports extend it, e.g.:
interface AccountingPort extends IntegrationAdapter<...> {
  listInvoices(orgId, since): Promise<Cached<Invoice[]>>;
  exportPayRun(orgId, run, idemKey): Promise<PayRunResult>;
}
```

Core services depend on `AccountingPort`, never on `xero`. A **NullAdapter** (returns `not_configured`, serves cached data, queues writes) is the default for any org that hasn't connected a provider — this is what makes degradation automatic rather than bolted-on.

### 1.2 Auth models at a glance

| Provider | Auth model | Token lifecycle | Where stored |
|---|---|---|---|
| Xero | OAuth 2.0 (PKCE) + tenant selection | 30-min access, 60-day rolling refresh | `integrations` (encrypted) |
| Google Workspace/Drive | OAuth 2.0 (offline, incremental scopes) | 1-hr access, long-lived refresh | `integrations` (encrypted) |
| Frame.io (V4) | OAuth 2.0 / server token (Adobe IMS) | per Adobe IMS | `integrations` (encrypted) |
| Cloudflare Stream (fallback) | Account API token (scoped) | static, rotateable | `integrations` (encrypted) |
| Resend | API key (per env) | static | server env + optional per-org `integrations` |
| WhatsApp Cloud API | System-user token + webhook verify | long-lived system token | `integrations` (encrypted) |
| Periskope | API key + webhook secret | static | `integrations` (encrypted) |
| Metricool | API key / token | static | `integrations` (encrypted) |
| TikTok Content Posting | OAuth 2.0 (per creator) | access + refresh | `integrations` (encrypted) |
| Instagram/Meta Graph | OAuth 2.0 (long-lived page token) | ~60-day, refreshable | `integrations` (encrypted) |
| Revolut Business | OAuth 2.0 (client-cert) / API cert | per Revolut | `integrations` (encrypted) |
| Stripe (alt payout rail) | Secret key + Connect | static | `integrations` (encrypted) |
| Anthropic Claude | API key (BYO, per-org) | static | `integrations` (encrypted) |

---

## 2. Integrations in detail

### 2.1 Accounting — Xero  · Milestone M5

**Purpose.** Xero is the system of record for money. Blanc Script OS reads invoices live, reflects their status (draft/sent/approved/paid), tracks VAT, and exports pay-run data. We do **not** become a ledger; we mirror and orchestrate.

**Data in:** invoices + line items, contacts (to reconcile against `clients`/`companies`), account codes (e.g. "200 · Sales"), tax rates ("VAT on Income" @ 20%), payment status, overdue ageing.
**Data out:** draft invoices created from quotes/projects; invoice status nudges; pay-run / bill export for crew & talent costs. (Writing *paid* status is normally done in Xero; we can push drafts and bills, gated by `can_invoice`.)

**API & auth.** Xero Accounting API, OAuth 2.0 with PKCE. Scopes: `accounting.transactions`, `accounting.contacts`, `accounting.settings`, plus `offline_access` for refresh tokens. Multi-tenant: after consent, store the selected `tenant_id` alongside tokens. Access tokens expire in 30 minutes; refresh tokens roll (use-once) with a 60-day window — **refresh must be centralised** in one place so a race doesn't invalidate the chain.

**Adapter → `AccountingPort`.** `listInvoices`, `getInvoice`, `createDraftInvoice`, `listContacts`, `getTaxRates`, `exportPayRunAsBills`. All reads cache into our own `invoices`/`invoice_lines` so the Finance module renders from local data; Xero is the refresher, not the render path.

**Rate limits / retry / idempotency.** Xero: ~60 calls/min and 5,000/day per tenant, with concurrent-call limits. Respect `Retry-After` on 429; exponential backoff. For creates, send a client-generated idempotency key and reconcile on the Xero invoice `InvoiceID` stored next to our UUID so a retried create never duplicates. Hourly background sync (see §3) plus webhook top-ups.

**Secrets.** OAuth client ID/secret are app-level (Vercel env, server-only); per-org access/refresh tokens + `tenant_id` encrypted in `integrations`.

**Degradation.** If Xero is down or disconnected: Finance shows last-synced invoices with a stale banner; "create invoice" queues a Trigger.dev job and shows "pending in Xero".

**Prerequisite (user):** a Xero organisation, a Xero developer app (client credentials), and someone with authority to connect it. Honest note: Xero's rolling refresh tokens are the most common source of "it logged itself out" — our single-refresher design is deliberate.

---

### 2.2 Google Workspace / Drive  · Milestone M4 (Drive) → M5 (Business Profile) → M6 (Meet polish)

**Purpose.** Store and surface brand files, contracts and reports in Drive; manage Google Business Profile for the Local-SEO/listings service; attach Meet links to shoots/meetings; optionally Google sign-in (secondary to Clerk — Clerk remains the auth of record).

**Data in:** Drive file/folder metadata, permissions, revision history; Business Profile locations, reviews, posts; Calendar/Meet link generation.
**Data out:** create per-client Drive folders, upload deliverables/reports, set sharing; create/update Business Profile posts and respond to reviews; create Meet links.

**API & auth.** Google OAuth 2.0, offline access, **incremental authorisation** — request Drive scopes when the user first uses Drive, Business Profile scopes only when they adopt Local SEO. Scopes: `drive.file` (preferred — app-created files only, least privilege) rising to `drive` only if full-folder management is required; `business.manage` for Business Profile; `calendar.events` for Meet. Store refresh token per org.

**Adapter → `DrivePort` / `BusinessProfilePort` / `MeetPort`** (three ports, one Google connection). Keep them separate so an org can use Drive without granting Business Profile.

**Rate limits / retry / idempotency.** Drive: per-user and per-project quotas; batch where possible, backoff on 403 `rateLimitExceeded`/429. Business Profile API has **low daily quotas and requires allow-listing** — plan for small, queued write volumes. Idempotency: check for an existing folder/file by our stored Google file ID before creating.

**Secrets.** App OAuth client server-side; per-org refresh tokens encrypted in `integrations`.

**Degradation.** Drive down → show cached file list (name, link, last-synced) and disable upload with a tooltip, not a dead button. Business Profile down → queue posts.

**Prerequisites (user):** a Google Cloud project with OAuth consent screen configured and **verified** (Drive/Business scopes are sensitive/restricted — Business Profile API access must be **requested and granted** by Google, which can take days to weeks). Honest note: Business Profile is the slowest external approval here; treat it as a lead-time risk, not a build risk.

---

### 2.3 Frame.io (+ Cloudflare Stream fallback assessment)  · Milestone M4

**Purpose.** Client-facing video review & delivery: send an edit for review, collect timestamped comments and approvals, deliver finals. This is the post-production review loop.

**Data in:** review/comment status, approval state, asset playback/share links.
**Data out:** create a review share for an edit, push the R2-hosted export to Frame.io (or share a signed R2 link into it), map comments back to `reviews`/`revisions`.

**API & auth.** Frame.io **V4** API via Adobe IMS (OAuth 2.0 / server-to-server token). Webhooks for comment-created and asset-status events. Store token per org.

**Adapter → `VideoReviewPort`:** `createReview(editId, assetUrl)`, `getReviewStatus`, `syncComments`, `markApproved`. Comments sync into our own `reviews`/`revisions` tables so the portal renders them natively even if Frame.io is unreachable.

**Rate limits / retry / idempotency.** Standard REST limits; backoff on 429. Webhook deliveries verified by signature, de-duplicated by event ID. Creating a review is idempotent on `edit_id` (store the Frame.io review ID).

**Secrets.** Per-org token encrypted in `integrations`; media itself stays in **R2** — we share signed URLs, we do not make buckets public (Foundation §1).

**Cloudflare Stream fallback — assessment.** We already use Cloudflare R2. **Cloudflare Stream** can host, transcode and deliver video with signed playback, and we could build an *in-app* review surface (our own comment UI over a Stream player) rather than relying on Frame.io.
- **Pros:** one vendor family with R2, lower cost, signed URLs we fully control, no per-client Frame.io seat, review UI lives in our portal (better degradation story — it's just our DB + our player).
- **Cons:** we must build the review/approval UX ourselves (timestamped comments, version stacks, side-by-side) — Frame.io gives this for free and clients may expect its polish; Stream is delivery + playback, not a review product.
- **Recommendation (Lead decision):** ship **M4 with Frame.io** behind `VideoReviewPort`; build a **Stream-backed in-app reviewer as the second adapter** so cost/UX can be compared with a real workload, and so we have a true fallback if Frame.io pricing or availability bites. The port makes this a swap, not a rewrite.

**Prerequisite (user):** a Frame.io (Adobe) account with API access.

---

### 2.4 Resend — transactional + digest email  · Milestone M1 (transactional) → M6 (digests)

**Purpose.** All outbound email: auth/portal invites, review-ready notifications, overdue-invoice chases, and the scheduled digests ("Today" summaries).

**Data in:** delivery/bounce/complaint webhooks (to suppress bad addresses and show send status).
**Data out:** transactional sends and batched digest sends, rendered from React email templates.

**API & auth.** Resend REST API, API key auth. Webhooks (signed) for delivered/bounced/complained.

**Adapter → `EmailPort`:** `send(template, to, data, idemKey)`, `sendBatch(...)`. Templates are versioned in-repo. The port is the only way the app sends mail, so a future swap (or a per-org white-label sender) is contained.

**Rate limits / retry / idempotency.** Respect Resend's rate limits; retries carry an idempotency key so a retried digest doesn't double-send. Bounces/complaints update a suppression list before the next send.

**Secrets.** Primary API key in server env (app-level). If an org wants to send from its own verified domain, store that org's Resend key/sender in `integrations` (encrypted) and the `EmailPort` selects per-org config.

**Degradation.** Resend down → queue in Trigger.dev and retry; never block the user action that triggered the mail. Critical invites also surface an in-app copyable link so a down mail provider doesn't block onboarding.

**Prerequisite (user):** a verified sending domain (SPF/DKIM/DMARC DNS records). Transactional email lands in **M1** because auth/invites need it early; digests wait for the automation layer in M6.

---

### 2.5 WhatsApp — Cloud API vs Periskope + messaging inbox  · Milestone M6 (read/inbox) → later (send)

**Purpose.** Client/talent messaging and a unified inbox (WhatsApp + Instagram DMs), with notes/forwards/tasks created off messages (the `wanotes`/`waforward`/`watask` pattern from the analysis).

**Two paths, one port.**
- **WhatsApp Cloud API (Meta, official).** Direct, lower per-message cost, first-class webhooks. **But:** requires a Meta Business account, a verified WhatsApp Business Account (WABA), **business verification**, a registered phone number, and template (HTTP "utility/marketing") message approval for anything outside the 24-hour customer-service window. Group chats are **not** supported by the Cloud API — it is 1:1 business messaging.
- **Periskope (what Centauri used).** A layer over WhatsApp that *does* handle **groups** and multi-number inboxes, via API key + webhooks. Faster to adopt, supports the group-based workflows the agency actually runs, at a vendor cost and with less control.

**Recommendation (Lead decision):** because the real workflow is **group-based** (client/talent groups), **Periskope** is the pragmatic first adapter; keep a **Cloud API adapter** behind the same `MessagingPort` for 1:1 official templated sends (e.g. automated review-ready / pay notifications) where cost and deliverability matter.

**Adapter → `MessagingPort`:** `listThreads`, `getThread`, `sendMessage(threadId, body, idemKey)` (gated by capability + AI "ask" confirmation — never auto-send), webhook ingest → `inbox`/notifications. Inbound messages are stored in our own tables so the inbox renders even when the provider is down.

**Rate limits / retry / idempotency.** WhatsApp has per-number throughput tiers and template limits; Periskope has its own. Every send carries an idempotency key; webhooks verified + de-duplicated by message ID.

**Secrets.** Periskope API key + webhook secret, or Meta system-user token + webhook verify token, encrypted in `integrations`.

**Prerequisites (user):** Meta Business verification + a dedicated WhatsApp number (slow, external), **or** a Periskope account. Honest note: WhatsApp sending is the most **compliance-gated** integration in the system — message templates and business verification are external approvals outside our control; plan inbox-read first, automated-send later.

---

### 2.6 Social — publishing + analytics  · Milestone M5

**Purpose.** Schedule and publish to TikTok/Instagram/etc., track per-post analytics, and pull trending TikTok sounds. This drives the Content & Social Studio and the post tracker.

**The honest landscape (this is where platform APIs disappoint):**
- **TikTok.** *Content Posting API* can publish (direct post or upload-to-drafts) **but** the app needs TikTok review/audit for direct posting, and unaudited apps are limited to private/draft posting. *Display API* gives limited post analytics. **Trending sounds have no official public API** — "trending sounds" is a Research/Creative-Centre surface, not a clean feed; scraping is against ToS and brittle. Treat trending-sounds as **best-effort/manual-assisted**, not a guaranteed automated feed.
- **Instagram/Meta Graph.** Publishing works via the Instagram Graph API **only for Business/Creator accounts connected to a Facebook Page**, and requires app review for `instagram_content_publish`. Reels publishing is supported but rate-limited (a per-account daily publish cap). Insights are available for business accounts. Stories support is limited. DMs require the Messaging API with additional permissions.
- **Metricool.** Aggregates scheduling + analytics across platforms behind **one** integration and absorbs much of the per-platform approval pain. API access depends on plan tier.

**Recommendation (Lead decision):** adopt **Metricool as the primary publishing+analytics adapter** (one connection, many networks, less app-review burden), and add **direct TikTok / Instagram Graph adapters** only where Metricool is insufficient (e.g. specific insight fields, or to reduce per-post cost at scale). All behind one `SocialPort` with per-network capability flags.

**Adapter → `SocialPort`:** `schedulePost`, `publishNow` (capability-gated), `getPostMetrics`, `listTrendingSounds` (best-effort), `reconcilePublishedToEdit` (the `videolink` idea — match a published post back to the internal edit by title/length/file). Metrics land in `post_metrics`; posts in `social_posts`.

**Rate limits / retry / idempotency.** Per-platform publish caps (notably IG reels/day); the 5-minute publishing job (see §3) must respect them and never retry a publish without an idempotency key (a double-publish is a public, un-deletable mistake — treat publish as the highest-risk idempotency case in the system).

**Secrets.** Metricool token and/or per-creator TikTok & Meta OAuth tokens, encrypted in `integrations`.

**Degradation.** Provider down → scheduled posts stay "scheduled (queued)", analytics show last-synced with a stale badge. Never show a post as "published" until the provider confirms.

**Prerequisites (user):** a Metricool account (and/or) a TikTok developer app with **audit approval** for posting, and a Meta app with **app review** for content publishing plus Business/Creator IG accounts linked to Pages. These approvals are the long pole of M5.

---

### 2.7 Payments / pay-runs — Revolut (or Stripe)  · Milestone M6

**Purpose.** Aggregate what's owed to talent/crew and execute payouts (the Revolut "actor run" / staff pay pattern), with a hard sandbox/live split.

**Data in:** payment state transitions (waiting-approval → submitted → bank processing → paid / failed / no-answer), account balances.
**Data out:** batch payouts/transfers created from `talent_payments`, gated by `can_pay_team` + `can_approve_pay` and a two-step confirm.

**API & auth.**
- **Revolut Business API.** OAuth 2.0 with a client certificate (mTLS-style); separate **Sandbox** and **Live** environments with separate credentials. Supports counterparties + transfers/payments.
- **Stripe (alternative).** Secret-key auth; **Connect/Payouts** for paying third parties; richer docs and testing, strong idempotency support. Better developer ergonomics; Revolut matches the agency's existing banking and the Centauri precedent.

**Recommendation (Lead decision):** build `PayoutPort` with a **Revolut adapter first** (matches real banking + precedent), keep a **Stripe adapter** as a documented alternative. Decision point for the Lead: which bank rail is contractually in use.

**Adapter → `PayoutPort`:** `buildRun(period)` (compute only, no side effects), `submitRun(runId, idemKey)` (capability-gated, approval-gated, confirmation-gated), `getRunStatus`, `syncPaymentStates`. The build step is pure; only `submitRun` touches money.

**Rate limits / retry / idempotency.** **Money movement is the strictest idempotency boundary.** Every transfer carries a deterministic idempotency key derived from `(run_id, payee_id)`; a retried submit must *reconcile*, never re-pay. Partial-batch failures are reconciled per-payee against stored provider payment IDs. Status is pulled via webhook + polling.

**Secrets.** Sandbox and Live credentials stored as **separate** encrypted rows/fields in `integrations`, with an explicit env flag; Live is never selectable without `can_approve_pay` + an org-level "go live" toggle. The real/test toggle is surfaced in the UI exactly as the analysis described.

**Degradation.** Provider down → run stays "built, not submitted"; no optimistic "paid". A failed/ambiguous transfer surfaces its exact state ("bank would not take it / no answer") rather than guessing.

**Prerequisite (user):** a Revolut Business account with API access + certificate (or a Stripe account with Connect enabled), and a named approver. Honest note: this is the highest-consequence integration — it moves real money. It is deliberately **last (M6)**, behind the strongest permission and confirmation gates, and ships to sandbox first.

---

### 2.8 Anthropic Claude — the AI layer  · Milestone M6 (foundations usable earlier for drafting)

**Purpose.** The Blanc Script AI system: draft invoice chases, surface what needs attention, answer questions over CRM data, and perform *agentic* actions through a typed tool catalogue — all within the current user's role + capabilities.

**API & auth.** Anthropic API, **bring-your-own-key per org**, server-side only (Foundation §1). Haiku for routine/classification, Sonnet/Opus for reasoning. Model IDs and tool-use wiring per the `claude-api` skill reference (consult it before implementation — do not hardcode model names from memory).

**Adapter → `AIPort`:** `complete`, `classify`, `runAgentTurn(threadId, tools)`. The tool catalogue mirrors the Centauri pattern but is **ours**, with three execution modes enforced server-side:
- **popup** — opens a pre-filled form for the user to confirm (e.g. `book_shoot`).
- **direct** — saves immediately, but **only** low-risk, reversible, capability-permitted writes (e.g. `add_task`).
- **ask** — explicit confirmation required for consequential/irreversible actions (`send_whatsapp`, `mark_invoice_paid`, `submit_pay_run`), each guarded by the matching capability flag.

Every tool call checks the acting user's capabilities **before** execution (the AI cannot exceed the human). Threads/messages persist in `ai_threads`/`ai_messages`; usage and budget are tracked per org.

**Rate limits / retry / idempotency.** Respect Anthropic rate/token limits; backoff on 429/overloaded. Tool executions that cause side effects reuse the same idempotency machinery as the underlying adapter (an AI-initiated payout is still one `PayoutPort.submitRun` with its key).

**Secrets.** Per-org Anthropic key encrypted in `integrations`; AI features are **opt-in** and only appear when a key is connected (or for the owner), exactly as the reference does.

**Degradation.** No key / Anthropic down → AI surfaces hide or show "connect a key / unavailable"; the rest of the app is unaffected (the AI is a layer, never a dependency of core flows).

**Prerequisite (user):** an Anthropic API key with budget.

---

## 3. Background jobs & automation — Trigger.dev  · Milestone M6 (with earlier stubs)

All schedules, syncs, webhook fan-out and multi-step automations run on **Trigger.dev** (Foundation §1). Jobs are org-aware, idempotent, and write to `activity_log`. Vercel functions handle *inbound* webhooks (verify + enqueue fast); Trigger.dev handles the *work* (retries, long-running, scheduled).

### 3.1 Scheduled jobs (planned)

| Job | Cadence | Purpose | Adapter |
|---|---|---|---|
| `accounting-sync` | Hourly | Pull Xero invoices/status/VAT into local tables | `AccountingPort` |
| `social-publish` | Every 5 min | Push due scheduled posts; respect per-platform caps; mark published only on confirm | `SocialPort` |
| `social-stats-refresh` | Daily | Refresh post/channel analytics into `post_metrics` | `SocialPort` |
| `trending-sounds` | Every 4 h | Best-effort TikTok trending sounds (degrades to manual if no feed) | `SocialPort` |
| `digests` | Daily (early AM) / weekly | Build "Today" + weekly summaries, send via Resend | `EmailPort` + `AIPort` |
| `token-refresh-sweeper` | Hourly | Proactively refresh OAuth tokens nearing expiry (Xero/Google/Meta) | all OAuth adapters |
| `payrun-status-sync` | Every 15 min while a run is open | Reconcile payout states | `PayoutPort` |

Anchor hourly/4-hourly jobs to the org's creation minute to spread load (not all on :00).

### 3.2 Webhook handling

Inbound webhooks (Xero, Frame.io, Resend, WhatsApp/Periskope, Meta, Revolut/Stripe) hit thin Vercel endpoints that: (1) **verify signature**, (2) **de-duplicate by event ID**, (3) persist raw payload, (4) enqueue a Trigger.dev task, (5) return 200 fast. Processing, retries and side-effects happen in the job, never in the webhook handler.

### 3.3 Workflow automations (planned)

Event-driven chains, each capability-gated and reversible/confirmable where consequential:
- **Shoot wrapped → create edit tasks.** `shootwrap` event seeds editing tasks, assigns an editor by capacity, sets edit-due clocks. (direct, reversible.)
- **Edit "Sent to Client" → create Frame.io review + notify.** `VideoReviewPort.createReview` + `EmailPort` + portal notification.
- **Client approves → "Ready to Post" → schedule.** Moves the edit state and creates a `social_posts` draft on the plan.
- **Invoice overdue → draft a chase.** `AIPort` drafts, held for human send (ask-mode) — never auto-sends money comms.
- **Pay period close → build pay-run.** `PayoutPort.buildRun` (compute only); submission stays a human, approval-gated action.
- **Published post → reconcile to edit.** `reconcilePublishedToEdit` attaches analytics to the right project.

---

## 4. Phased rollout (mapped to milestones)

| Milestone | Integrations landing | Notes |
|---|---|---|
| **M1 Core Foundation** | **Resend** (transactional: auth, invites). Adapter framework + `integrations` table usage + NullAdapter pattern established. | Email is needed for auth/portal invites day one. |
| **M2 Core Operations** | None new; Google **Meet** link helper optional for meetings/calendar. | Keep core operable with zero external deps. |
| **M3 Production** | None hard-required. | Shoots/crew/equipment are internal. |
| **M4 Post-production + Client portal** | **Frame.io** (`VideoReviewPort`) + **Cloudflare Stream** fallback adapter; **Google Drive** (deliverables/contracts/reports). | Media already in R2; review is the new surface. |
| **M5 Finance + Content/Social** | **Xero** (accounting sync, VAT, pay-run export-as-bills); **Social** via **Metricool** (+ optional direct TikTok/Meta); **Google Business Profile** for Local SEO. | Longest external-approval lead times live here (Xero app, Meta/TikTok review, Business Profile allow-listing). |
| **M6 AI + Automation + Integrations** | **Anthropic Claude** (`AIPort` + tool catalogue); **Trigger.dev** schedules + webhooks + workflow automations; **WhatsApp/Periskope** inbox; **Revolut/Stripe** pay-runs (sandbox → live). | Highest-consequence + most compliance-gated integrations land last, behind permissions + confirmations. |

---

## 5. External-account prerequisites the user must provide

Nothing below can be built around by us — these are the user's accounts/approvals:

1. **Resend** — account + a **verified sending domain** (SPF/DKIM/DMARC DNS). *(M1 — needed early.)*
2. **Google Cloud project** — OAuth consent screen, verified; Drive scopes; **Business Profile API access requested & granted** (slow). *(M4/M5.)*
3. **Frame.io / Adobe** account with API access. *(M4.)*
4. *(Fallback only)* **Cloudflare** account/API token for Stream — likely already present via R2. *(M4.)*
5. **Xero** — organisation + developer app (OAuth client), and an authorised connector. *(M5.)*
6. **Metricool** account (plan tier that includes API). *(M5.)*
7. **TikTok** developer app with **posting audit** approval; **Meta** app with **app review** for content publishing + Business/Creator IG accounts linked to Facebook Pages. *(M5 — long approval lead time.)*
8. **WhatsApp**: a **Periskope** account, and/or Meta **Business verification** + dedicated WhatsApp number + approved message templates. *(M6 — compliance-gated.)*
9. **Revolut Business** account with API access + client certificate (or **Stripe** with Connect). *(M6 — money movement.)*
10. **Anthropic** API key with budget, per org (BYO-key). *(M6.)*

---

## 6. Decisions needed from the Lead

1. **Video review:** confirm **Frame.io first, Stream-backed in-app reviewer as second adapter** (cost/UX comparison) — or go Stream-only to stay in the Cloudflare family.
2. **Social:** confirm **Metricool as primary** vs committing to direct TikTok/Meta Graph integrations (more approval burden, more control). Accept that **trending sounds are best-effort**, not a guaranteed automated feed.
3. **WhatsApp:** confirm **Periskope-first** (supports the real group workflows) with Cloud API for official 1:1 templated sends — vs Cloud-API-only (no groups).
4. **Payout rail:** **Revolut vs Stripe** — which bank rail is contractually in use; confirm sandbox-first, named approver, and the live-enable gate.
5. **Email sender model:** single app-level Resend key vs per-org white-label senders in `integrations`.
6. **Google scope minimisation:** `drive.file` (app-created files only) vs full `drive` — affects what the agency can see/manage and the sensitivity of Google's review.

---

*End of INTEGRATIONS_ROADMAP.md (v0, all planned). Conflicts with the Foundation: none identified. This document consumes `_FOUNDATION.md` and does not redefine the stack or schema.*
