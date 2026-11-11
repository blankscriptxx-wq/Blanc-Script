# Centauri OS (crm.centauri.org.uk) — Reverse‑Engineering Analysis

**Prepared:** 11 Nov 2026
**Target:** https://crm.centauri.org.uk and its sibling subdomains
**Method:** Inspection of **publicly served files only** — HTTP headers, the HTML shell, `config.js`, the PWA manifest, and the compiled (minified) JavaScript bundles that the site hands to every browser. No login was attempted, no account was used, and the backend database was **not** queried. Nothing behind authentication was accessed.

> **How to read this.** Findings are tagged:
> - **[Verified]** — read directly from the site's own files.
> - **[Inferred]** — a reasonable deduction from naming/strings in the code, not confirmed by seeing it run.
> - **[Unknown]** — cannot be established from outside the login.
>
> Because the app is a login‑gated single‑page app, **all feature detail below is drawn from the UI text and logic embedded in the public JavaScript.** That text is real and shipped, but I have not watched the features execute, so treat workflow specifics as **[Inferred]** unless marked otherwise.

---

## 1. What it is

**[Verified]** Centauri OS describes itself in its own manifest as *"The Centauri team's CRM: shoots, edits, clients and the book."* It is the internal operations platform for **Centauri**, a creative/technical agency in Birmingham (`www.centauri.org.uk` — *"Creative & Technical Agency in Birmingham"*) that does **video production and social‑media management**.

It is **not** a generic CRM. It is a bespoke, end‑to‑end **production + social‑media agency operating system** covering: clients, the sales pipeline, shoot bookings, a cast/"talent book", video editing workflow, social posting and analytics, invoicing/accounting, actor payments, team chat, and an embedded AI assistant.

**[Verified]** It is a **Progressive Web App (PWA)** — installable to desktop and phone, with a service worker, app icons, and home‑screen shortcuts (Today, My shoots, Calendar, Chat).

---

## 2. The wider Centauri system (subdomains)

All are hosted on **Vercel**. **[Verified]** by fetching each one's homepage:

| Subdomain | `<title>` / behaviour | Role **[Inferred]** |
|---|---|---|
| `crm.centauri.org.uk` | **Centauri OS** | Staff‑facing CRM (this document's subject) |
| `client.centauri.org.uk` | *Home · Centauri · Client portal* | Where **clients** log in to see their own shoots, videos, chat |
| `actor.centauri.org.uk` | *Home · Centauri · Talent* | Where **actors/talent** apply, onboard and get paid |
| `hub.centauri.org.uk` | redirects to `/login` | A separate gated internal tool **[Unknown]** purpose |
| `web.centauri.org.uk` | *Centauri Solutions: Your website in 48 hours* | A productised website‑build offering / app frame |
| `www.centauri.org.uk` | Marketing site | Public agency website |

**[Verified]** The CRM and the client portal talk to the **same** backend database (same Supabase project id in both their security policies), so clients and staff read/write a shared data set under different permissions.

---

## 3. Technical architecture

### 3.1 Front end **[Verified]**
- **Single‑page app** built with **React** (the bundles ship React's `jsx-runtime`).
- Bundled by **Vite + Rolldown** (the file naming and `__vite__mapDeps` loader are unmistakable). Output is code‑split into lazy‑loaded chunks.
- **Hash‑based routing** (routes look like `/#/today`, `/#/myshoots`, `/#/calendar`, `/#/chat`).
- The whole UI is static files served from Vercel's CDN; there is **no server‑rendered HTML** beyond an empty `<div id="root">`.
- Heavy use of **accessibility attributes** (hundreds of `aria-*` roles) — it's been built carefully, not thrown together.
- Fonts loaded from Google Fonts; a large curated set (Inter, Geist, Chivo, Archivo, etc.).

The code is split into feature chunks whose names map directly to the product areas:
`start` (the main app, ~1.7 MB), `shoot`, `pay`, `onboardlink`, `social-stats`, `posttrack`, `tracking`, `integrations`, `platformui`, `brandmarks`, `marks`, `videolink`, `bits` (shared UI, ~300 KB). **[Verified]**

### 3.2 Back end **[Verified]**
- **Supabase** (hosted Postgres + Auth + Realtime + Edge Functions + Storage) is the backend. Two projects are referenced:
  - `qoylxwrsuypkmjevtkml.supabase.co` — the primary CRM/portal database (used over HTTPS **and WebSocket**, i.e. live realtime updates).
  - `kspqwjovqdxjhmixcozi.supabase.co` — a second Supabase project, role **[Unknown]** (possibly a separate auth or a different product).
- The Supabase **publishable/anon key is deliberately public** (it's in `config.js`, with a comment: *"Public keys — the rules live on the server"*). Security is therefore enforced by **Row‑Level Security policies in Postgres**, not by hiding the key. **[Verified]** This is the standard, correct Supabase pattern.
- **Realtime** (WebSocket) is used — **[Inferred]** this powers live chat, notifications and collaborative updates without refresh.

### 3.3 Data model **[Inferred, strong]**
The code reads and writes a small number of Supabase tables, notably a single generic **`records`** table (referenced far more than any other), plus **`profiles`**, **`media`**, and **`client_logins`**. This points to a **single‑table / document‑style model**: most business objects (clients, shoots, tasks, videos, invoices, posts, actors…) are rows in `records` distinguished by a "kind" field, rather than one table per entity. Writes appear to funnel through a server **Edge Function `write_record`** (see below) rather than direct table inserts — **[Inferred]** a deliberate choice to centralise validation, permissions and audit.

### 3.4 Server‑side logic — Supabase Edge Functions **[Verified]** (names only)
These function names appear in the client code as things it calls:
`write_record`, `team-signin`, `google-connect`, `my_spaces`, `access_changes`, `system_status`, `report_client_error`, `save_client_login`, `reveal_client_login`, `delete_client_login`, `forget_me`, `preview_profile`, `preview_records`, `preview_visits`.
**[Inferred]** from the names: a central write/validation path, team authentication, Google OAuth connection, workspace/membership listing, permission‑change tracking, health checks, error reporting, management of the credentials the agency stores on a client's behalf (`*_client_login`), a GDPR "forget me" erasure path, and a "preview" (impersonate/see‑as) capability for support.

### 3.5 Scheduled jobs **[Verified]** (identifiers in code)
Named schedules are referenced: `xero-sync-hourly`, `tiktok-sync-daily`, `tiktok-sounds-every-4-hours`, `social-publish-every-5-min`, `oldcrm-every-2-minutes`. **[Inferred]** the platform runs background jobs to pull accounting data from Xero hourly, refresh TikTok stats daily, fetch trending TikTok sounds every 4 hours, push scheduled social posts every 5 minutes, and migrate/sync from an **old CRM** every 2 minutes (i.e. a live migration was/is running).

### 3.6 Security posture **[Verified]**
Strong, modern headers: a strict **Content‑Security‑Policy** (locking scripts to same‑origin — which is *why* config and keys are separate static files), `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS for 2 years, `nosniff`, a tight `Permissions-Policy`, and `X-Robots-Tag: noindex` (deliberately kept out of search engines).

---

## 4. Integrations **[Verified]** that the app connects to

Read from hostnames and integration UI text in the code:

| Integration | Purpose **[Inferred]** |
|---|---|
| **Supabase** | Database, auth, realtime, storage, server functions |
| **Xero** | Accounting: invoices are *read from Xero as live data*; VAT (20% "VAT on Income"), a "200 · Sales" account, pay‑run export |
| **Google** (OAuth, Drive, Business Profile, Meet) | Sign‑in; brand files/contracts/reports stored in **Drive**; Google Business Profile management; Meet links |
| **TikTok** | Post stats, trending sounds |
| **Instagram / Meta** | Instagram inbox, post stats, "Invite Centauri to your Meta Business Suite" |
| **Frame.io** | Video review/delivery (client portal allows `*.frame.io` and `*.cloudfront.net`) |
| **Metricool** (`app.metricool.com`) | Social scheduling/analytics |
| **Revolut** | Paying actors/talent ("Actor run built — £…", "of N actors") |
| **Periskope** | WhatsApp management (webhooks; WhatsApp group ids, Instagram/WhatsApp inbox) |
| **WhatsApp** (`wa.me`, `chat.whatsapp.com`) | Client/talent messaging |
| **Anthropic Claude** | Embedded AI assistant — **"Claude Haiku 5.5"** named in code |

---

## 5. Feature areas (from the shipped UI text)

> All **[Inferred]** from embedded strings unless noted; the strings themselves are **[Verified]** present.

### 5.1 Today / home dashboard
A "Today" landing view that surfaces what needs attention: footage due, edits assigned, invoices overdue, portal logins waiting, catch‑up calls this week, tasks past deadline, new sign‑ups, drafts ready. A global **command palette / search** — *"Jump anywhere… A client, a shoot, a person, a task, a page…"*.

### 5.2 Clients
Client records with account manager/main contact, brand kit (colours, guidelines, voice, personality), contracts and reports in Drive, a per‑client **checklist** run weekly/monthly, a sales **pipeline** ("added to the pipeline", "proposal sent", "Call booked"), and client deletion gated to owner/admin. Clients get a **portal invite** and see things "in the portal".

### 5.3 Shoots & production
Book a shoot, content plan & shoot brief, shot list, call/running order, crew notes, "On site" status, locations (extra‑location pricing), camera gear day rates (*"£40 a camera day"*), cancel/edit shoot (gated to owner/admin). Two shoots on one day count as one shoot day.

### 5.4 Cast / talent book
A **talent book** of actors; cast a shoot from the book, add talent, talent applications, "Actor open day", a rule *"Never reuse an actor from another client."* "No actors — the client's own people on camera" is an option. Actors are paid (see 5.8).

### 5.5 Editing workflow
After a shoot, footage is uploaded ("Drag the clips or a whole folder here", Raw vs Final counts), an **editor is assigned** with capacity tracking, edit states (*Being Edited, Revision Needed, Sent to Client, Ready to Post*), edit‑due clocks, archive/restore (gated). "Choose clips for…", "Export the finals".

### 5.6 Social posting & tracking
A **post tracker**: posting days/cadence ("Posting on pace", "x of target posted"), captions, scheduling, "did not go out / going out", per‑platform publishing (TikTok/Instagram/etc.), reels. **Analytics**: views, likes, followers gained/lost, profile views, TikTok post‑view totals ("2.3M TikTok post views in year one"). Trending TikTok sounds pulled in.

### 5.7 Finance — "the book", invoicing
Invoices are **read live from Xero**; raise the first invoice, monthly invoicing, quotes/proposals attached, "approved/paid/draft/sent" states, "Draft a chase for the overdue invoices" (AI‑assisted), VAT handling, "only the owner changes a paid line". A hand‑entered ledger exists alongside Xero.

### 5.8 Actor pay‑runs
A **pay run** aggregates what's owed to actors and pays them via **Revolut** ("Actor run built — £X", "Anyone unpaid comes out of the pay run", "Pay the Monday after", "Take X's shoot pay off").

### 5.9 Chat / messaging
Internal and client **chat** with group chats, direct messages, mentions, unread counts, threads, "median first reply" metrics; integrates external inboxes (Instagram inbox, WhatsApp groups via Periskope).

### 5.10 Calendar & tasks
A calendar view; tasks with deadlines, prep tasks, time‑blocking ("Every task of yours has time blocked"), weekly/strategy meeting logging, "+ Task".

### 5.11 AI assistant (Claude) **[Verified: present]**
An embedded **Claude** assistant ("Ask Claude", "Check with Claude now", "What Claude noticed", "AI usage & budget", connect/disconnect with an **Anthropic API key**, model **Claude Haiku 5.5**). **[Inferred]** it drafts invoice chases, surfaces things needing attention, and answers questions over the CRM data.

### 5.12 Onboarding & guided tours
A **client onboarding** flow by business type ("video production", "social management", "service business", "websites & apps", goals, brand files, posting days). The app also ships a substantial **scripted walkthrough/tour engine** (hundreds of programmatic step/click/navigate instructions, `data-step`/`data-chapter`) — **[Inferred]** an in‑product guided tour or an interactive demo mode.

### 5.13 Roles, permissions & settings
Roles seen: **Owner, Admin, Account Manager, Editor, SuperAdmin**, plus client and talent users. Many actions are explicitly gated ("Only an owner or an admin…", "Archiving needs an admin or an account manager"). **Settings** cover company details, brand colours/skins (the UI is themeable — `data-crm-theme`, `data-crm-skin`), integration connections, approvals & access, AI usage & budget, and management of stored client logins (with reveal/delete and an audit of access changes).

---

## 6. Representative user journeys **[Inferred]**

1. **New client → first shoot:** add client to pipeline → proposal/quote → "Call booked" → onboarding (business type, brand kit, goals) → portal invite → book a shoot → content plan & brief → cast from talent book → shoot day ("On site") → footage uploaded.
2. **Footage → published:** upload raw → assign editor → edit (Being Edited → Revision Needed → Sent to Client) → client approves in portal → Ready to Post → scheduled via post tracker → auto‑published → stats tracked.
3. **Money:** work delivered → invoice raised (synced to Xero) → chase drafted by Claude if overdue → marked paid → actors' pay aggregated into a Revolut pay run.

---

## 6a. Deeper findings from the shipped code **[Verified]**

Further reading of the bundles pins down specifics that were only inferred above.

### Roles (exactly five staff roles)
The role‑specific AI prompt sets name them directly: **`owner`**, **`ops`** (operations/admin), **`staff`** (account managers), **`editor`**, and **`mf`** — the on‑shoot **filmer/videographer** (their prompts are *"Where am I filming next?"*, *"Who else is on my next shoot?"*, *"Add a task to charge the batteries"*). Clients and talent are separate user types in the portals.

### Data model: one `records` table, ~130 "kinds"
**[Verified]** The single `records` table carries a `kind` field; roughly 130 distinct values appear, which is how one table represents every object and every dashboard card. Notable kinds:
`shoot`, `newshoot`, `shootedit`, `shootwrap`, `project`, `task`, `tasktime`, `deadline`, `person`, `actor`, `actorpay`, `casting`, `openday`, `video`, `upload`, `review`, `audio`, `image`, `brief`, `meeting`, `meetnote`, `weekly`, `weeklysetup`, `invoice`, `odentry` (hand‑entered ledger line), `payslip`, `payprofile`, `editorbalance`, `editorweek`, `post`, `posting`, `clientposts`, `trackpick`, `ttpick` (TikTok sound pick), `lead`/`leadedit`, `churn`, `lost`, `complaint`, `onboarding`, `onboardsteps`, `portalinvite`, `portallogin`, `portalask`, `clientaccess`, `login`, `password`, `access`/`accessedit`, `contractterms`, `group`, `inbox`, `wanotes`/`waforward`/`watask` (WhatsApp), `tutorial`/`tutorials`, `notifications`, `setting`. **[Inferred]** the `*new`/`*edit` suffixes are the create/edit card states, and the "Today" feed is assembled from these typed cards.

### The AI assistant is agentic — a real tool catalogue
**[Verified]** Claude isn't just a chat box; it's wired with structured **tool use** (Anthropic `input_schema`, `stop_reason: "tool_use"`). Each tool declares three things: an **execution `mode`**, a **permission guard** (`may:`), and a typed input schema. Modes:
- **`popup`** — opens the matching form pre‑filled for the user to confirm (e.g. `book_shoot`).
- **`direct`** — saves immediately (e.g. `add_task`, `update_client`, `add_lead`, `move_lead`, `assign_video`).
- **`ask`** — requires explicit confirmation (e.g. `send_whatsapp` — *"Only when they asked you to send it"*; `mark_invoice_paid`, guarded by `canInvoice`).

Read tools: `search_clients`, `find_shoots`, `find_videos`, `find_tasks`, `calendar`, `find_leads`, `inbox`, `read_conversation`, `find_invoices`, `find_pay`, `find_posts`, `get_client_context`.
Write/action tools: `add_task`, `update_task`, `add_lead`, `update_lead`, `move_lead`, `add_client_update`, `update_client`, `add_project`, `book_shoot`, `move_shoot`, `cancel_shoot`, `assign_video`, `mark_posted`, `mark_invoice_paid`, `send_whatsapp`, `send_dm`.
The Claude button only appears for the **owner** or when an **Anthropic API key** is connected — **[Verified]** the AI layer is opt‑in and bring‑your‑own‑key.

### Permissions: capability flags on top of roles
**[Verified]** Beyond the five roles, access is gated by fine‑grained **capability booleans** checked throughout the UI. The ones in the code: `canManage` (by far the most used), `canPayTeam`, `canApprovePay`, `canSeeActorPay`, `canInvoice`, `canSeeMoney`, `canFees`/`canEditFees`, `canSettings`, `canManageUsers`, `canLogins`, `canContract`, `canArchive`, `canEdit`, `canName`, `canAct`, plus `isOwner`/`isOps`. **[Inferred]** roles map to a default set of these, which is what lets, say, an account manager do client work but not see money or run payroll.

### Payroll & bank payments (actors and staff)
**[Verified]** `pay` chunk shows a real payroll engine: hourly rates (*"£X an hour"*, *"No rate set"*, *"Free · staff member"*), **travel pay** added on top, per‑shoot counts, and live **bank payment states**: *waiting to be approved → going out now → bank is on it → part of it went / the bank would not take it / no answer from the bank*, with a **test account vs the real account** toggle. **[Inferred]** this is the Revolut pay‑run executing real transfers with a sandbox mode.

### On‑shoot specifics
**[Verified]** `shoot` chunk tracks **cast turn‑up** ("turned up" / "did not"), an **age flag** ("over 16"), "nobody cast yet", and references filming "on Kepler" (**[Unknown]** — "Kepler" is an internal codename, purpose not established; Centauri/Kepler suggests a space‑themed set of internal systems).

### Service packages & monthly playbooks
**[Verified]** `social-stats` reveals **productised services**, each with a **recurring monthly checklist** the system generates:
- **Social management** — *"Check every post went out, every week"*, *"Agree this month's design list"*, *"Build this month's report"*, *"Counting from the posts again"*.
- **Local SEO / listings** — *"Check all three listings each month"*, *"Claim and verify every location"*, **Google Business**, **Google Analytics**.
- **Photography** (incl. restaurant/menu) — *"Book the photography day"*, *"Collect the brand files and fonts"*, *"Deliver the retouched set to the folder"*, *"Deliver print‑ready and social sizes"*; delivery‑platform work for **Deliveroo**/**Just Eat** (*"menu photography live"*).
- **Advertising / out‑of‑home** — *"Billboards, buses, influencers"*, *"Get quotes and negotiate the rate"*, *"Book, brief and track the run"*.

**[Verified]** Named **retainer plans** exist — e.g. **Growth**, **Growth (legacy)**, and **Growth Lite (£X a month)** — so clients sit on priced monthly tiers that drive which playbooks run. **[Inferred]** picking a client's services/plan seeds their recurring tasks automatically. (The `marks`/`brandmarks` chunks are just inline **SVG logos/wordmarks** for the platforms and brands.)

### Automatic post‑to‑edit matching
**[Verified]** `videolink` chunk matches a **published social post back to the internal edit it came from**, using signals like the video **title/name in the caption**, the **same file**, and **about the same length** ("made from this edit"). **[Inferred]** this auto‑reconciles the post tracker against what actually went out, so analytics attach to the right project without manual linking.

---

## 7. What could NOT be established **[Unknown]**

- The actual database schema (table columns, the `records` "kind" values, relationships).
- The exact Row‑Level Security rules / true permission boundaries.
- The internal logic of the Edge Functions (only their names are visible).
- Anything behind the login: real screens, data, the admin/`hub` tool, the client and talent portals' full feature sets.
- Whether every stringed feature is live, partial, or legacy.
- The second Supabase project's role, and the `hub` subdomain's purpose.

---

## 8. Build takeaways (for a Centauri‑class system of your own)

Nothing here needs their code. The architecture is a well‑chosen, reproducible stack:

- **Front end:** React SPA (or Next.js) as an installable PWA.
- **Back end:** Supabase (Postgres + Auth + Realtime + Edge Functions + Storage), security via Row‑Level Security, a public anon key, and a single `write_record`‑style server entry point for validated writes.
- **Separate portals** (staff / client / talent) over one shared database with role‑based policies.
- **Integrations** as needed: Xero (accounting), a social scheduler (Metricool) + platform APIs, Frame.io (video review), a payment rail (Revolut/Stripe), WhatsApp (Periskope), Google/Drive, and Claude for the AI layer.
- **Background jobs** for syncing and scheduled publishing.

A realistic build order: (1) clients + auth + roles, (2) shoots + tasks + calendar, (3) editing workflow + media, (4) client portal, (5) social post tracker + analytics, (6) invoicing/Xero, (7) chat, (8) AI assistant, (9) talent book + pay‑runs.

---

### Appendix — evidence trail (all public)
HTTP headers and CSP of `crm.centauri.org.uk`; `/config.js`; `/manifest.webmanifest`; the HTML shell; the JS chunks under `/assets/` (`index`, `start`, `shoot`, `pay`, `social-stats`, `tracking`, `posttrack`, `integrations`, `onboardlink`, `brandmarks`, `marks`, `videolink`, `bits`, `fmt`); and the homepages of the sibling subdomains. Raw copies were saved to this session's scratchpad during analysis (not committed).
