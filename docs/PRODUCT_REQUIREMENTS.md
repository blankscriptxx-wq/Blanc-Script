# Blanc Script OS — Product Requirements

**Status:** Planned (v0). Consistent with `_FOUNDATION.md` and `PRODUCT_VISION.md`. British English throughout.
**Owner:** Product.
**Scope note:** Functional requirements only. The schema (`DATABASE_SCHEMA.md`) and stack/architecture are owned elsewhere and are **not** redefined here. Entities are referenced by the spine's table names (`_FOUNDATION.md` §4). Roles and capability flags per `_FOUNDATION.md` §3. Everything below is **planned** unless a later status doc says otherwise.

## How to read this document
- Organised by the **10 product systems** (A–J, `_FOUNDATION.md` §5).
- Each system has: **Purpose · User stories (by role) · Key screens · Workflows · States & edge cases · Acceptance criteria**.
- Roles: `owner`, `ops`, `account_manager (AM)`, `editor`, `filmer`; portal users: `client_user`, `talent_user`.
- Capability flags referenced inline: `can_see_money`, `can_invoice`, `can_pay_team`, `can_approve_pay`, `can_see_actor_pay`, `can_manage_users`, `can_settings`, `can_contract`, `can_edit_fees`, `can_archive`.
- **MoSCoW:** (M) Must, (S) Should, (C) Could — for v1 prioritisation.

## Global conventions (apply to every system)
- Every list view supports: search, filter, sort, saved views, empty state, loading state, error state, and pagination.
- Every entity view shows an **activity timeline** sourced from `activity_log`.
- Money shown in £ from integer pence; UK VAT-aware; times in Europe/London from stored UTC.
- Soft-delete via `archived_at`; destructive actions gated by `can_archive` and confirmed; GDPR hard-erase is a separate explicit path.
- All consequential writes (including AI writes) append to `activity_log`.
- Mobile-first for filmer/shoot surfaces; responsive everywhere; installable PWA.
- No dead buttons: a control the user lacks capability for is hidden or clearly explained, never a silent no-op.

---

# System A — Command Centre

**Purpose:** The per-role "what needs attention now" home plus a global command palette. One place that assembles the day from the spine.

### User stories
- As **owner**, I want the business's risks and numbers (overdue `invoices`, capacity breaches, churn-risk `clients`, cash) on one screen so I act before I'm asked.
- As **ops**, I want today's `shoots`, editor load, and anything past deadline so I can rebalance the day.
- As **AM**, I want my `clients`' pending `approvals`, retainer pace, catch-up calls due and content awaiting sign-off.
- As **editor**, I want my `edits` queue ordered by due-clock and anything in Revision Needed.
- As **filmer**, I want my next shoot, crew and call sheet, mobile-first.

### Key screens
1. **Today** — role-tailored cards: footage due, `edits` assigned/at-risk, `invoices` overdue, portal logins waiting, catch-up calls this week, `tasks` past deadline, new talent sign-ups, drafts ready to post, `talent_payments` ready to run.
2. **Command palette** — global fuzzy search across `clients`, `shoots`, `projects`, `contacts`, `talent`, `tasks`, pages; keyboard-first; recent + suggested.
3. **This week** — compact calendar strip (shoots, deadlines, posting days, meetings).
4. **AI attention panel** — "What Blanc Script AI noticed" (System J), within the user's permissions.

### Workflows
- On load, assemble cards by role + capabilities; each card deep-links to the owning entity.
- Palette query → ranked results by type → open or run a quick action (e.g. "+ Task", "Book shoot").
- Dismiss/snooze a card (persisted per user); dismissals do not alter the underlying entity.

### States & edge cases
- Empty org (fresh tenant): friendly first-run with setup checklist, not a blank page.
- A user with no `can_see_money`: money cards absent entirely (not greyed).
- Stale integration (e.g. Xero sync failed): card shows degraded state with last-good timestamp, never silently wrong.

### Acceptance criteria
- (M) Today renders only cards the role+capabilities permit; each is accurate against the spine and links to source.
- (M) Palette returns results within perceptible-instant latency and respects RLS (never surfaces other tenants or forbidden records).
- (M) Snooze/dismiss persists per user and never mutates business data.
- (S) AI attention panel present only when AI is enabled for the org and the user may see its inputs.

---

# System B — CRM & Client Management

**Purpose:** Leads pipeline, companies/contacts, client records with brand kit, retainers, notes, onboarding, and client deletion governance.

### User stories
- As **AM/ops**, I want a `leads` pipeline (added → proposal sent → call booked → won/lost) so nothing stalls.
- As **AM**, I want a `clients` record with brand kit, contracts, retainer tier, main contact and a run of notes so I'm always briefed.
- As **owner**, I want client deletion gated to me/ops and a GDPR path.
- As **client_user**, I want onboarding by business type to be quick and clear (handled in System I; data lands here).

### Key screens
1. **Pipeline board** — `leads` by stage; drag between stages; value, source, owner; conversion metrics.
2. **Company/Contact directory** — `companies`, `contacts` with roles and comms.
3. **Client record** — header (account manager, main contact, retainer tier); tabs: Overview, Brand kit (`brand_assets`: colours, guidelines, voice/personality, fonts, logos), Projects, Shoots, Content, Finance (gated), Notes (`client_notes`), Portal access, Activity.
4. **Onboarding intake** — business type, goals, brand files, posting days (feeds `clients`, `brand_assets`, retainer playbook seeding).

### Workflows
- **Lead → client:** create `lead` → attach `quote`/`proposal` → "call booked" → on win, convert to `clients` (carry company/contact/brand), trigger onboarding, seed retainer playbook if a `retainers` tier is chosen, send portal invite.
- **Churn/complaint handling:** mark a client at-risk or log a complaint note; surface in Command Centre and AI attention.
- **Deletion:** archive (`can_archive`) vs GDPR erase (explicit, owner-gated, cascades per privacy policy).

### States & edge cases
- Lead lost: capture reason; keep for analytics; do not delete.
- Duplicate company/contact: merge flow preserves history.
- Client with no retainer (project-only): finance behaves per-project, no monthly playbook.
- **Talent exclusivity rule (improved from Centauri "never reuse an actor from another client"):** enforced in System H but client record shows which `talent` are reserved/used for this client.

### Acceptance criteria
- (M) Pipeline stage changes and lead→client conversion persist and log to `activity_log`.
- (M) Brand kit is reusable downstream (briefs, content, portal) from `brand_assets`.
- (M) Client deletion respects `can_archive`/owner gating; GDPR erase is separate and audited.
- (S) Onboarding selections seed the correct retainer playbook and default content cadence.

---

# System C — Projects & Tasks

**Purpose:** The work breakdown between a client engagement and the production/post reality: `projects`, `project_templates`, `tasks`, `task_dependencies`, calendar and time-blocking.

### User stories
- As **ops/AM**, I want to spin up a `project` from a `project_template` so a standard job (e.g. a video package or a social month) comes pre-built.
- As **any staff**, I want `tasks` with deadlines, dependencies and time-blocks, and a calendar view.
- As **ops**, I want recurring retainer `tasks` generated each month automatically.

### Key screens
1. **Projects list/board** — status, client, owner, due, % complete.
2. **Project detail** — tasks, dependencies, linked `shoots`/`edits`/`content_items`, timeline, deliverables.
3. **Task board / list** — assignee, deadline, dependency state, time-block; "+ Task".
4. **Calendar** — shoots, deadlines, posting days, meetings, time-blocks; per-user and team views.
5. **Template manager** — `project_templates` (versioned, parameterised).

### Workflows
- **Template → project:** choose template → parameters (deliverable counts, posting days, shoot-day allowance) → expands into `project`, `tasks`, `task_dependencies`, draft `shoot_briefs`/`content_items`.
- **Retainer monthly generation:** on cycle start (Trigger.dev), the client's `retainers` tier seeds that month's playbook tasks and content items (see System F/G).
- **Dependencies:** a task blocked by an unfinished predecessor cannot be started; completing a predecessor unblocks successors and can auto-advance states (e.g. "footage uploaded" unblocks "assign editor").

### States & edge cases
- Circular dependency: rejected at creation with a clear message.
- Template improved later: existing projects unaffected (versioning); new projects use the new version.
- Project cancelled mid-flight: open tasks archived, linked shoots/edits handled with confirmation.

### Acceptance criteria
- (M) A template expansion creates all expected tasks/dependencies and is idempotent (re-run doesn't duplicate).
- (M) Dependency rules are enforced; no task starts before predecessors complete.
- (M) Calendar reflects shoots/deadlines/posting days from their source tables in real time.
- (S) Retainer generation runs on schedule and is traceable in `activity_log`.

---

# System D — Production Studio (shoots)

**Purpose:** Book and run shoots end to end: `shoots`, `shoot_briefs`, `shot_lists`, `call_sheets`, `locations`, `equipment`, `crew_assignments`, and on-site mobile flow.

### User stories
- As **ops**, I want to book a `shoot` with brief, shot list, crew, gear and location, and have its cost model understood.
- As **filmer**, I want my call sheet, shot list, crew and the ability to mark cast turn-up and wrap — on my phone.
- As **AM**, I want the client to see the shoot in their portal and the content plan behind it.

### Key screens
1. **Shoot booking** — date, client/project, type, `locations` (+extra-location pricing), `equipment` (camera day rates), `crew_assignments` (filmers/roles), linked brief.
2. **Shoot brief** (`shoot_briefs`) — content plan, objectives, references, brand kit pull-through.
3. **Shot list** (`shot_lists`) — ordered shots, priority, status.
4. **Call sheet / running order** (`call_sheets`) — times, location, crew, cast, notes; mobile-optimised.
5. **On-site mode (filmer, PWA)** — today's shoot, turn-up capture, shot ticking, wrap, charge-batteries-style prep tasks.

### Workflows
- **Book shoot:** create `shoot` → brief + shot list → assign crew (`crew_assignments`) → cast from talent book (System H) → confirm gear/location → publish call sheet → client sees it in portal.
- **Shoot day:** status flows **Scheduled → On site → Wrapped**; filmer marks cast turn-up ("turned up"/"did not") and age-flag checks; wrap triggers footage-upload readiness and opens the edit lane (System E).
- **Cost model:** camera day rates, extra-location pricing, travel; **two shoots on one calendar day count as one shoot day** (improved: configurable rule, surfaced in capacity and costing).

### States & edge cases
- Nobody cast yet / "client's own people on camera" (no talent) — both valid; capacity and pay handle accordingly.
- Shoot cancelled/moved: gated (`can_archive`/ops); notifies crew, cast and client; releases held talent and gear.
- Weather/overrun: on-site notes and re-shoot linkage.
- Age flag (under/over 16) must be resolved before a minor is marked present (right-to-work/safeguarding).

### Acceptance criteria
- (M) A booked shoot carries brief, shot list, crew, gear and location and appears on calendar + client portal.
- (M) Shoot-day-count rule computes correctly for multi-shoot days and feeds capacity/costing.
- (M) Turn-up and wrap capture work on mobile and drive downstream state (edit lane opens on wrap).
- (M) Cancel/move is capability-gated, notifies affected parties, and releases resources.

---

# System E — Post-production Studio (edits)

**Purpose:** Footage in, finished deliverable out: `media_assets`, `edits`, `edit_assignments`, `reviews`, `revisions`, `approvals`, `deliveries`, with honest editor capacity and edit clocks.

### User stories
- As **ops**, I want to assign an `editor` with visible capacity so nobody is silently overloaded.
- As **editor**, I want my queue, the right Raw clips, the brief, and a clean revision loop.
- As **AM/client_user**, I want review and approval to be one clear action with a tracked trail.

### Key screens
1. **Footage upload** (`media_assets`, R2) — drag clips or a whole folder; **Raw vs Final counts**; signed-URL secure access.
2. **Edit queue / editor board** — `edits` by state and due-clock; per-editor capacity meter.
3. **Edit detail** — brief, shot list, Raw picker ("choose clips for…"), linked review thread, export Finals.
4. **Review & approval** — `reviews` with timecoded comments (Frame.io adapter; Cloudflare Stream fallback), `revisions`, `approvals`.
5. **Capacity planner** — editor load across the week/month (shared with System H).

### Workflows (the core chain)
- **Shoot wrap → edit:** wrap opens an `edit`; Raw uploaded to `media_assets`; brief/shot list attached.
- **Assign editor:** `edit_assignments` with capacity check; AI may suggest an assignee (System J) for human confirm.
- **Edit states:** **Being Edited → Sent to Client (review) → Revision Needed → … → Approved → Ready to Deliver.** Edit-due clock runs against each state.
- **Review loop:** editor sends to client → `review` in portal → client comments/approves or requests changes → `revision` created on change request; approve creates an `approval`.
- **Approval → delivery:** an `approval` **automatically** advances the edit to deliverable, creates the `delivery` (Final export), and seeds a draft `content_item`/`social_post` (System F) and proposes an invoice/retainer drawdown (System G) — no re-keying.

### States & edge cases
- Revision ping-pong: cap/flag excessive revision rounds; scope-creep note for AM/finance.
- Editor over capacity: assignment warns and requires override; forecast shows the breach ahead of time.
- Raw missing/partial: edit cannot move to "Sent to Client" until required Raw present.
- Archive/restore of edits gated (`can_archive`).

### Acceptance criteria
- (M) Upload stores to `media_assets` with signed-URL access and correct Raw/Final counts.
- (M) Editor capacity is enforced on assignment with explicit override + log.
- (M) Edit state machine is strict; review→revision→approval each create their own records.
- (M) An approval auto-creates the `delivery` and seeds the content draft + finance proposal.
- (S) Forward capacity forecast flags breaches before the due date.

---

# System F — Content & Social Studio

**Purpose:** Plan, schedule, publish and measure social content: `content_items`, `content_calendar`, `social_posts`, `post_metrics`, with post-to-edit matching and retainer cadence.

### User stories
- As **AM**, I want a content calendar on pace with the retainer so I can prove every post went out.
- As **ops/AM**, I want scheduling and per-platform publishing with captions and reels.
- As **AM/client_user**, I want analytics (views, likes, followers, profile views) and auto-built monthly reports.

### Key screens
1. **Content calendar** (`content_calendar`) — posting days/cadence, "posting on pace / x of target posted", per-client.
2. **Content item editor** (`content_items`) — caption, assets (from `deliveries`/`media_assets`), platform targets, schedule.
3. **Post tracker** (`social_posts`) — scheduled/going out/did not go out/published, per platform (TikTok/Instagram/etc.), reels.
4. **Analytics** (`post_metrics`) — per-post and roll-up; trending TikTok sounds surfaced; followers gained/lost.
5. **Monthly report builder** — auto-draft from `post_metrics` for client portal (AI-assisted, System J).

### Workflows
- **Retainer cadence:** retainer playbook seeds the month's `content_items` on the client's posting days; "agree this month's design list" and "build this month's report" appear as tasks (System C/G).
- **Approved edit → post:** a `delivery` seeds a draft `content_item`; AM finalises caption/platforms/schedule → `social_posts` publishes via scheduler adapter (Trigger.dev scheduled publishing).
- **Post-to-edit matching (improved):** auto-link a published `social_post` back to its originating `edit` via title/caption, file identity and duration, so `post_metrics` attach to the right `project` for reporting and margin — with a manual override when the auto-match is unsure.
- **"Check every post went out":** weekly reconciliation flags any `content_item` that did not publish.

### States & edge cases
- Platform publish failure: post marked "did not go out" with reason; retry; never silently dropped.
- Caption/asset missing at schedule time: blocked with clear prompt.
- Metrics lag/stale: show last-sync time; never present stale numbers as live.

### Acceptance criteria
- (M) Content items schedule and publish per platform; failures are explicit and retryable.
- (M) Pace tracking is accurate against retainer target; weekly reconciliation catches misses.
- (M) Post-to-edit matching links posts to edits/projects with manual override.
- (S) Monthly report auto-drafts from `post_metrics` into the client portal.

---

# System G — Finance & Commercials

**Purpose:** Quotes to cash: `quotes`, `proposals`, `invoices`, `invoice_lines`, `expenses`, `payments`, `retainers`, Xero-linked, UK VAT-aware, with capability gating.

### User stories
- As **owner/ops (`can_invoice`, `can_see_money`)**, I want invoices tied to delivered work and synced to Xero, and chases handled.
- As **AM**, I want to build `quotes`/`proposals` but (by default) not see full money or change paid lines.
- As **owner**, I want only me to change a paid line (`can_edit_fees` + gating).

### Key screens
1. **Quotes & proposals** — build `quotes`/`proposals`, attach to lead/client, convert to invoice.
2. **Invoices** (`invoices`, `invoice_lines`) — states draft/sent/approved/paid; Xero link; VAT lines; chase drafting.
3. **Retainers** (`retainers`) — tier, monthly value, playbook, drawdown against delivery.
4. **Expenses & payments** (`expenses`, `payments`) — costs against project/shoot; reconciliation.
5. **Finance dashboard** — revenue, overdue, margin per project/client (owner/ops).

### Workflows
- **Delivery → invoice:** a `delivery` or retainer cycle close **proposes** an invoice from the `quote`/`retainer` → push to Xero (hourly sync adapter) → track `payments` back → mark paid.
- **Overdue chase:** AI drafts a chase for overdue `invoices` (System J), owner/AM sends; status tracked.
- **Retainer billing:** monthly `invoices` raised per tier; scope-creep (excess revisions/extra shoots) flagged for add-on lines.
- **Paid-line protection:** editing a paid `invoice_line` requires `can_edit_fees` and owner gating; logged.

### States & edge cases
- Xero sync failure: local state preserved; degraded banner with last-good time; no double-invoicing.
- VAT edge cases (zero-rated, reverse charge): handled per UK rules; never float arithmetic.
- Credit note / partial payment / dispute: represented explicitly, not as a deleted invoice.

### Acceptance criteria
- (M) Money is integer pence + currency; VAT computed correctly; no floats.
- (M) Invoice states and Xero sync are consistent and idempotent; no duplicates on retry.
- (M) `can_see_money`/`can_invoice`/`can_edit_fees` gating enforced on every money surface and action.
- (M) Delivery/retainer close proposes the correct invoice against the source quote/tier.

---

# System H — Team, Talent & Resources

**Purpose:** Staff management, the talent `book`, availability, casting, and actor/staff pay-runs: `talent`, `talent_availability`, `talent_payments`, plus `memberships`, `equipment`, `crew_assignments`, `locations`.

### User stories
- As **ops**, I want a talent `book`, availability, and to cast a shoot respecting the no-reuse-across-clients rule.
- As **ops (`can_pay_team`/`can_approve_pay`)**, I want to build a pay-run of what's owed and pay via the bank rail with a sandbox.
- As **talent_user**, I want to apply, onboard (age/right-to-work, bank, agreement), set availability, see castings and get paid transparently (System I).
- As **owner (`can_manage_users`)**, I want to manage staff `memberships`, roles and capability overrides.

### Key screens
1. **Talent book** (`talent`) — profiles, skills, rates, status, client-exclusivity reservations.
2. **Availability** (`talent_availability`) — calendar; open-day intake.
3. **Casting** — cast a shoot from the book; add talent; applications; turn-up outcomes feed pay.
4. **Pay-run** (`talent_payments`) — aggregate owed (hourly rate + travel, per-shoot counts), approve, execute via bank adapter, payslips.
5. **Team & resources** — staff `memberships`/roles/capabilities; `equipment` day rates; `locations`.

### Workflows
- **Casting → turn-up → pay:** cast from book → talent confirms (portal) → on shoot day filmer marks turn-up → turned-up talent accrue pay (rate + travel) → aggregated into a pay-run.
- **Pay-run (improved from Centauri Revolut run):** build run ("run built — £X of N people") → **approve** (`can_approve_pay`) → execute via bank adapter with **test vs real account** toggle → per-payment bank states: *waiting to be approved → going out now → bank is on it → paid / partial / bank refused / no answer*; "pay the Monday after"; "anyone unpaid rolls into the next run"; "take X's shoot pay off".
- **Staff admin:** invite user → Clerk membership → assign role → override capability flags as needed.

### States & edge cases
- **Exclusivity:** block casting a `talent` already used for another client (improved into an enforced constraint with an explicit override + reason, logged).
- **Age/right-to-work:** a talent under 16 (or without verified right-to-work) is flagged and cannot be paid until resolved.
- Bank refusal/no-answer: payment left unpaid, clearly stated, rolls to next run; never assumed paid.
- `can_see_actor_pay` gates who sees pay figures at all.

### Acceptance criteria
- (M) Casting respects exclusivity with gated override + log.
- (M) Turn-up outcomes drive pay accrual correctly (rate + travel + per-shoot counts).
- (M) Pay-run requires `can_approve_pay`; sandbox/real toggle is unmistakable; every payment's bank state is tracked truthfully.
- (M) Unpaid/refused payments roll forward; nothing is silently marked paid.
- (M) Staff role + capability management gated by `can_manage_users`/`can_settings`.

---

# System I — Portals (client + talent)

**Purpose:** Strongly isolated external experiences on the same spine under RLS: the **client portal** and the **talent portal**.

### User stories
- As **client_user**, I want to see only my shoots, videos to approve, content calendar, results and invoices, and message my AM.
- As **talent_user**, I want to apply, onboard, set availability, see confirmed shoots and get paid transparently.

### Key screens — Client portal
1. **Home** — upcoming `shoots`, `reviews` awaiting approval, recent posts, outstanding `invoices`.
2. **Review & approve** — timecoded `reviews`; one-tap `approval` or request changes (`revisions`).
3. **Content** — `content_calendar` and published results with `post_metrics`; monthly report.
4. **Finance** — their `invoices` and payment status (read-mostly).
5. **Messages** — thread to AM; onboarding flow by business type.

### Key screens — Talent portal
1. **Apply / onboard** — profile, age/right-to-work verification, bank details, agreement acceptance.
2. **Availability** (`talent_availability`).
3. **Castings & shoots** — invitations, confirmed `shoots`, call details.
4. **Pay** — `talent_payments` history, payslips, current run status.

### Workflows
- **Approval:** client opens `review` → approve (creates `approval`, advances edit, see System E) or request change (creates `revision`).
- **Onboarding (client):** business type → goals → brand files → posting days → seeds `clients`/`brand_assets`/retainer playbook.
- **Talent onboarding → payable:** apply → verify age/right-to-work → bank + agreement → becomes castable and payable.

### States & edge cases
- **Isolation is absolute:** a portal user can never see another client's or another talent's data (RLS-enforced); no cross-tenant leakage; signed URLs only for media.
- Invite pending / login not yet activated: visible to staff ("portal logins waiting") without exposing data.
- Talent not yet verified: cannot be paid; limited portal.
- GDPR "forget me" available from the portal, routed to the erasure path.

### Acceptance criteria
- (M) Every portal read/write is RLS-scoped to that user's own `clients`/`talent`; no cross-record access.
- (M) Client approval in the portal drives the edit state machine and creates `approval`/`revision` records.
- (M) Media is served only via signed URLs; no public buckets.
- (M) Talent cannot be paid until age/right-to-work verified.
- (S) Onboarding seeds the correct downstream records and playbook.

---

# System J — Blanc Script AI

**Purpose:** An agentic Claude layer that reads the whole spine within the user's permissions and takes guarded actions; plus a proactive attention/digest pass.

### User stories
- As **any staff**, I want to ask the AI about my clients/shoots/edits/invoices and have it answer from real data within my permissions.
- As **owner/ops**, I want the AI to draft invoice chases, suggest editor assignments, propose pay-runs and flag risks — always with confirmation on consequential actions.
- As **AM**, I want auto-drafted monthly client reports and retainer-health summaries.

### Key screens
1. **Ask panel / thread** (`ai_threads`, `ai_messages`) — conversational, grounded, cites the records it used.
2. **Attention digest** — proactive "what needs attention" per role (overdue invoices, at-risk edits, retainers behind pace, cold leads, pay-runs ready).
3. **AI settings** — BYO Anthropic key (server-only), model choice (Haiku routine / Sonnet-Opus reasoning), usage & budget.

### Tooling model
- **Read tools** (free to call): search clients, find shoots/videos/tasks, calendar, find leads, inbox, find invoices, find pay, find posts, get client context.
- **Write/action tools** with three modes and a capability guard each:
  - `popup` — opens a pre-filled form to confirm (e.g. book shoot).
  - `direct` — safe immediate saves (e.g. add task, move lead, assign edit).
  - `ask` — explicit confirmation required (e.g. mark invoice paid [`can_invoice`], send client message, propose/execute pay-run [`can_approve_pay`]).
- Every tool runs **within the caller's role + capabilities** and logs to `activity_log`.

### Workflows
- **Grounded answer:** user asks → AI selects read tools → composes answer citing records → optional follow-up action via a guarded write tool.
- **Proactive digest (Trigger.dev scheduled):** nightly pass builds per-role attention items; surfaced in Command Centre; no action taken without the user.
- **Drafting:** invoice chases, shoot briefs/shot-list first drafts from content plans, monthly reports from `post_metrics`, retainer-health summaries.

### States & edge cases
- AI disabled / no key: AI surfaces hidden cleanly; app fully usable without it (adapter down ≠ app down).
- Permission mismatch: AI refuses/queues an action the caller lacks capability for; never escalates privilege.
- Consequential action without confirmation: impossible by design — `ask` mode blocks until confirmed.
- Hallucination guard: answers cite source records; actions only via typed tools, never free-text side effects.

### Acceptance criteria
- (M) AI acts strictly within the caller's role + capabilities; cannot exceed them.
- (M) Consequential writes use `popup`/`ask` confirmation; all AI writes log to `activity_log`.
- (M) BYO key is server-side only; never shipped to client; usage/budget tracked.
- (M) With AI off, every system remains fully functional.
- (S) Proactive digest is accurate per role and links to source records.

---

# Cross-system end-to-end workflows (reference)

### W1 — Lead to cash (the spine)
`lead` (pipeline) → `quote`/`proposal` → win → `clients` + onboarding + retainer seed → `project` (from template) → `shoot` booked (brief, shot list, crew, cast) → shoot day (turn-up, wrap) → `media_assets` (Raw) → `edit` assigned (capacity-checked) → `review` in portal → `revision`/`approval` → `delivery` → `content_item`/`social_posts` published → `post_metrics` → invoice proposed → Xero → `payments` paid → actor `talent_payments` pay-run.

### W2 — Retainer monthly playbook
Cycle start → `retainers` tier seeds month's `tasks` + `content_items` on posting days → content produced/approved/published → weekly "every post went out" reconciliation → monthly report auto-drafted → retainer `invoice` raised → scope-creep add-ons flagged.

### W3 — Talent casting to pay-run
Open day/application → onboard (age/right-to-work, bank, agreement) → set `talent_availability` → cast to `shoot` (exclusivity-checked) → confirm in portal → turn-up on shoot day → pay accrues (rate + travel) → aggregated into pay-run → approved (`can_approve_pay`) → executed via bank adapter (sandbox/real) → payslip in talent portal; unpaid rolls forward.

---

# Open questions for the Lead

1. **Video review provider default:** Frame.io adapter as primary with Cloudflare Stream fallback is assumed (`_FOUNDATION.md` §1). Confirm which is the v1 default for the client-portal review surface.
2. **Pay rail:** Centauri uses Revolut-style runs; the foundation names a generic pay adapter. Confirm the v1 bank provider and whether a sandbox toggle is in scope for v1.
3. **Social scheduler:** publish via a third-party scheduler adapter vs direct platform APIs — confirm v1 approach (affects System F acceptance).
4. **Retainer tiers:** names/values/playbook contents are Blanc Script's to define — needs a canonical tier list to parameterise `project_templates`/`retainers`.
5. **AI availability:** AI is BYO-key and opt-in; confirm whether it ships in v1 (M6) or whether the attention digest is earlier.
6. **Shoot-day rule configurability:** "two shoots one day = one shoot day" — confirm whether this is fixed policy or a per-org setting.
