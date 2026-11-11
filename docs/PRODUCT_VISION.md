# Blanc Script OS — Product Vision

**Status:** Planned (v0). Consistent with `_FOUNDATION.md`. British English throughout.
**Owner:** Product. **Consumes:** `_FOUNDATION.md`, `docs/centauri-crm-analysis.md`.
**Scope note:** This document sets direction and principles. Functional detail lives in `PRODUCT_REQUIREMENTS.md`. The schema and stack are owned elsewhere and are not redefined here; entities are named by the spine's table names (`_FOUNDATION.md` §4).

---

## 1. One-line vision

**Blanc Script OS is the single operating system a UK video, photo and social agency runs its whole business on** — from a cold lead to a paid invoice, with every shoot, edit, post and payment in one place, and an AI layer that quietly does the chasing, matching and planning the team would otherwise do by hand.

It is not a generic CRM with production bolted on. It is production-shaped from the ground up: the unit of work is a **shoot day** that flows into **edits**, into **client approval**, into **published posts**, and into **money** — staff, clients and talent each seeing exactly their slice through strongly isolated portals.

---

## 2. Who it serves

Blanc Script OS is multi-tenant and multi-role. Internal roles and external portal users map to the roles in `_FOUNDATION.md` §3; what each one needs from the product:

### Internal (staff)
- **Owner** — the whole business at a glance: revenue, margin, capacity, risk. Can see money, approve pay, change paid lines, manage users and settings. Lives in the Command Centre (System A) and Finance (System G). Wants fewer surprises: overdue invoices chased before they ask, editor overload flagged before a deadline slips, churn risk surfaced early.
- **Ops / admin** — the engine room. Books shoots, assigns editors, keeps capacity balanced, runs the weekly cadence, manages talent and pay-runs, owns integrations and templates. Needs the scheduling and capacity tools (Systems D, E, H) to be fast and truthful.
- **Account manager (staff)** — owns a book of `clients`: relationships, retainer playbooks, content plans, approvals, reporting. Does client work but, by default, does **not** see money or run payroll (capability-gated). Wants the retainer month to run itself and the client portal to make them look good.
- **Editor** — a queue of `edits` with honest due-clocks and a capacity ceiling that protects them from silent overload. Wants clear briefs, the right Raw clips to hand, and a frictionless review→revision loop.
- **Filmer / videographer** — mobile-first, shoot-day focused: where am I filming, who's on the crew, what's the shot list and call sheet, mark cast turn-up, confirm wrap. Everything a phone can do on site.

### External (portal-only, strongly isolated)
- **Client user** — sees only their own `clients` world: shoots booked, videos to review and approve, content calendar, posted results and reporting, invoices, and a direct line to their account manager. The portal is where approvals happen and where the agency's professionalism shows.
- **Talent user** — applies to the talent `book`, onboards (right-to-work/age, bank details, agreements), sets `talent_availability`, sees castings and confirmed shoots, and gets paid transparently with payslips from `talent_payments`.

---

## 3. The core problems it solves

A UK video/photo + social agency loses time and money in the seams between tools. Blanc Script OS closes them:

1. **The shoot→edit→post→invoice chain is fragmented.** Footage lives in Drive, edits in Frame.io, approvals in email, posts in a scheduler, invoices in Xero, actor pay in a bank app. Nobody has one truthful view. **BSOS makes that chain one spine** (`shoots → media_assets → edits → reviews → approvals → deliveries → content_items → social_posts → invoices`) so a project's state is always known and nothing falls between apps.
2. **Capacity is invisible until it hurts.** Editors get overloaded, shoot days clash, retainers quietly slip. **BSOS models capacity as first-class data** — editor hours, shoot-day load, retainer obligations — and warns before the breach, not after.
3. **Retainers are run from memory.** The monthly "did every post go out, was the report built, was the design list agreed" checklist lives in someone's head. **BSOS turns `retainers` into playbooks** that generate the month's `tasks` and `content_items` automatically and track them to done.
4. **Money is disconnected from delivery.** Work gets delivered but invoicing lags; chases are awkward; actor pay is a manual aggregation. **BSOS ties `invoices` to `deliveries` and `retainers`**, keeps Xero in sync, and builds actor/staff **pay-runs** from the shoots people actually turned up to.
5. **Clients and talent are second-class.** They're emailed PDFs and WhatsApp links. **BSOS gives them real portals** on the same data, under strict RLS, so review/approval, availability and pay are self-serve and auditable.
6. **Knowledge isn't actionable.** The data exists but nobody acts on it. **The AI layer (System J) reads the whole org within the user's permissions** and does the chasing, matching, drafting and flagging — as guarded tools, never silent consequential actions.

---

## 4. Product principles

1. **Production-native, not CRM-generic.** The shoot day is the heartbeat. Every screen respects the real sequence of agency work.
2. **One spine, many lenses.** One normalised data model (`_FOUNDATION.md` §4); Command Centre, portals and reports are views over it, never parallel copies.
3. **Truthful capacity over optimistic scheduling.** The system would rather show a red warning than let a deadline silently rot. Edit clocks, editor load and shoot-day counts are honest.
4. **Permissions you can feel.** Roles plus capability flags (`can_see_money`, `can_pay_team`, `can_approve_pay`, …) shape every surface. People see what they should, cleanly — no dead buttons, no greyed mysteries.
5. **AI within the user's authority.** The AI acts only inside the current role + capabilities, uses read tools freely, and routes any consequential write through `popup` (pre-filled confirm), `direct` (safe saves) or `ask` (explicit confirmation) modes. It never spends money, pays talent or messages a client without the right permission and a confirmation.
6. **Portals earn trust.** Client and talent experiences are premium, isolated and self-serve. Approval is one clear action; pay is transparent.
7. **Planned vs implemented is never blurred.** Every feature states its status; no fake data, no dead controls (`_FOUNDATION.md` §2).
8. **Adapters, not lock-in.** Frame.io, Xero, the pay rail, social platforms and Claude all sit behind adapter interfaces; the app runs if a provider is down.
9. **British by default.** £/pence minor units, UK VAT, Europe/London display, UK spelling, UK right-to-work and payroll realities.

---

## 5. How Blanc Script OS goes beyond Centauri OS

Centauri is a strong reference (`docs/centauri-crm-analysis.md`), but it carries the compromises of its build. BSOS improves on it deliberately. These are concrete, grounded in the Centauri analysis, and made Blanc Script's own.

### 5.1 A real relational spine instead of one `records` table
Centauri funnels ~130 object "kinds" through a single generic `records` table with a `write_record` edge function (analysis §3.3, §6a). It works, but it makes reporting, constraints, capacity maths and migrations hard. **BSOS uses one table per entity** (`_FOUNDATION.md` §4) with real foreign keys, typed columns, money as integer pence, and per-table RLS. The payoff: trustworthy capacity and margin reporting, referential integrity (an `edit` really belongs to a `shoot` which belongs to a `project`), and clean per-entity permissions — none of which a `kind`-tagged blob gives you cheaply.

### 5.2 Smarter project templating
Centauri seeds recurring tasks from service packages/retainer plans (analysis §6a, "picking a client's services seeds their recurring tasks"). **BSOS makes templating first-class and composable** via `project_templates` and `retainers`:
- **Service-type templates** (video production, social management, photography incl. menu/restaurant, local SEO/listings, advertising/OOH) that expand into `projects`, `tasks`, `task_dependencies`, `shoot_briefs` and `content_items` with sensible defaults.
- **Retainer-tier templates** (e.g. a Growth-class tier) that generate the **monthly playbook** — the recurring obligations — automatically each cycle.
- Templates are **versioned and parameterised** (deliverable counts, posting days, shoot-day allowance), so improving a template improves future projects without rewriting history.

### 5.3 Genuinely smart capacity planning
Centauri tracks editor capacity and edit-due clocks and counts "two shoots on one day as one shoot day" (analysis §5.3, §5.5). **BSOS turns capacity into a planning surface, not just a counter:**
- A **unified capacity view** across `edit_assignments` (editor hours/load), `crew_assignments` (filmer shoot-days) and `retainers` (committed monthly output).
- **Forward load forecasting**: given booked `shoots` and their likely Raw→Final edit effort, show which editors/weeks will breach before they do.
- **Assignment suggestions** that respect skill, client continuity and current load — surfaced for a human to confirm, never auto-assigned silently.
- **Shoot-day economics** baked in (camera day rates, extra-location pricing, travel) so scheduling and costing share one model.

### 5.4 A tighter shoot→edit→post→invoice flow
Centauri has the pieces — upload Raw/Final, assign editor, edit states, client approval, Ready to Post, post tracker, Xero invoicing, post-to-edit matching (analysis §5.5–5.8, §6a). **BSOS stitches them into one continuous, auditable flow** where each stage hands the next its inputs automatically:
- Shoot wrap flips the `shoot` state and opens the `edits` queue with the brief and shot list attached.
- An approved `review`/`approval` **automatically** advances the `edit` to deliverable, creates the `delivery`, and seeds the `content_item` + `social_post` draft — no re-keying.
- **Post-to-edit matching** is improved into a reliable link (`social_posts ↔ edits`) using title/caption, file identity and duration, so `post_metrics` attach to the originating project and feed both client reports and margin.
- A completed `delivery` (or a retainer cycle closing) **proposes the invoice** against the `quote`/`retainer`, pushes to Xero, and tracks `payments` back — closing the loop from footage to cash.

### 5.5 A genuinely useful, well-governed AI layer
Centauri's Claude is agentic with a real tool catalogue and permission guards (analysis §6a). **BSOS keeps that model and raises it:**
- **Proactive, not just reactive.** Beyond "ask Claude", a scheduled intelligence pass (via Trigger.dev) produces a "what needs attention" digest per role: overdue `invoices` to chase, `edits` at risk of missing clock, `retainers` behind pace, `leads` going cold, `talent_payments` ready to run.
- **Grounded tools over the real spine.** Read tools (clients, shoots, videos, tasks, calendar, leads, invoices, pay, posts, client context) and guarded write tools (add/update task, move lead, book/move shoot, assign edit, mark posted, draft invoice chase, propose pay-run) — each with `mode` (`popup`/`direct`/`ask`), a capability guard, and a typed schema, logged to `activity_log`.
- **Strictly within permissions.** The AI inherits the caller's role + capabilities and cannot exceed them. BYO Anthropic key, server-side only; Haiku for classification/routine, Sonnet/Opus for reasoning.
- **New AI value Centauri doesn't visibly have:** capacity forecasting narratives, retainer-health summaries for account managers, auto-drafted monthly client reports from `post_metrics`, and shoot-brief/shot-list first drafts from the content plan.

### 5.6 Other concrete improvements
- **First-class approvals & revisions** as their own entities (`reviews`, `revisions`, `approvals`), giving a clean audit trail of who approved what, when — stronger than state strings on a record.
- **Deliveries as records** (`deliveries`) so "what we actually handed over" is explicit and invoiceable, not implied by an edit state.
- **Capability flags as true overrides**, not role-baked assumptions, so edge cases (a trusted editor who can see money on one client) are expressible.
- **Audit-first**: `activity_log` on consequential actions, including every AI write and every credential reveal, by design.
- **PWA, offline-tolerant shoot mode** for filmers on patchy site signal (planned): call sheet, shot list and turn-up capture queue and sync.

---

## 6. What success looks like

- An account manager starts a retainer month and the playbook, tasks and content calendar are already there.
- A filmer wraps a shoot on their phone; by the time they're back, the editor's queue already has the job, briefed.
- A client opens the portal, approves a cut in one tap, and the post draft and invoice are set in motion without a single email.
- The owner opens the Command Centre on Monday and the three things that actually matter this week are already at the top — because the AI read the whole business overnight, within the rules.

That is the bar: **the seams disappear, capacity stays honest, and the money follows the work.**
