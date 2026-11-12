# Blanc Script OS — Your Checklist (things only you can do)

Left for you by the overnight build. I can't do these myself (they need your
accounts, approvals, money, or a decision). Tackle in roughly this order.
Everything I built sits on the `blanc-script-os` branch; nothing touches the live
marketing site. Progress log: `docs/OVERNIGHT_LOG.md`.

## What I built while you slept (all live on real data)
All **10 primary modules + Settings** are now built, wired to the Neon database,
and verified rendering (signed-in Playwright smoke test, no runtime errors). The
final commit's Vercel preview deploy is **READY** (green).

- **Today** — live KPI counts + your real packages from the DB
- **Clients** — list, add, record drawer
- **Projects** — list, add, record drawer
- **Shoots** — bookings, add, record drawer
- **Edits** — deliverables review board (Editing → In review → Changes requested → Approved → Published)
- **Content** — content pipeline board (Idea → Scripting → Filming → Editing → Scheduled → Posted), channel pills
- **Finance** — invoices + summary tiles (Outstanding / Paid this month / Overdue); gated behind `can_see_money`
- **Team** — members, roles, capabilities
- **Talent** — talent book with rates & status
- **Settings** — appearance (3 themes), workspace rename (gated), full roles × capabilities matrix

Every write is org-scoped through one `requireUser()` gate and audited to `activity_log`.
I seeded a handful of **demo rows** (talent, invoices, deliverables, content) so the
boards aren't empty when you look — delete them anytime, or I can clear them for you.

## 0. First thing — see it running
- [ ] Open the live preview and sign in: it's linked in `OVERNIGHT_LOG.md` (latest Vercel URL).
  - Your demo login still works: `demo@blancscript.dev`. Create your **own** account via Sign up — then tell me the email and I'll grant it owner (or you keep using the demo one).
- [ ] Have a click around all three themes (switcher, top-right) and the new modules (Edits, Content, Finance, Talent, Settings).

## 1. Infrastructure decision
- [ ] **Dedicated Vercel project?** Right now the OS builds inside your *marketing* Vercel project (as previews only — safe). Recommended: give it its own project + domain (e.g. `os.blancscript.com`). If yes, tell me and I'll prep it; you'll click "Create project" and point the domain.
- [ ] If it moves out: remove the DB env vars that got added to the marketing project's **Production** (`DATABASE_URL`, `POSTGRES_*`, `PG*`) — the marketing site doesn't use them.

## 2. Accounts & API keys
Add each in Vercel → the OS project → Settings → Environment Variables (scoped to the
`blanc-script-os` branch / the new project), then tell me and I'll wire + test it.
- [ ] **Anthropic API key** — turns on the AI assistant. (`ANTHROPIC_API_KEY`)
- [ ] **Resend** — email (invites, chases). API key + verify a sending domain. (`RESEND_API_KEY`)
- [ ] **Cloudflare R2** — media/footage storage (needed from Post-production). account id, access key id, secret, bucket. (`R2_*`)
- [ ] **Trigger.dev** — background jobs/schedules. (`TRIGGER_SECRET_KEY`)
- [ ] **Frame.io / Adobe** — video review (your pick). account + OAuth app.
- [ ] **Metricool** — social scheduling/analytics. API-tier plan + key.
- [ ] **Xero** — accounting/invoices. connect your org + OAuth app.
- [ ] **Periskope** — WhatsApp inbox + groups. account + webhook URL (I'll give you the URL).
- [ ] **Monzo Business** — confirm the pay-run approach (OS prepares + you upload the file) and who approves pay-runs.

## 3. Long-lead approvals (start now — they take days/weeks)
- [ ] **Aniro AI → Meta app review** finished (unlocks direct social publishing).
- [ ] **WhatsApp Business verification / message templates** (via Aniro or Periskope).
- [ ] **TikTok posting API** audit.
- [ ] **Google Business Profile API** allow-listing.
- [ ] Decide whether to build the **Aniro WhatsApp-inbox service** (brief: `docs/aniro-whatsapp-integration-brief.md`).

## 4. Review / sign-off
- [ ] **Security (RLS):** glance at how tenant isolation is set up — notes in `OVERNIGHT_LOG.md`.
- [ ] **Privacy & Terms:** a solicitor should review before real client/talent portals go live.
- [ ] **Stored client logins:** confirm the security design (KMS vault + dual-control) before it's switched on.
- [ ] **Pricing/packages:** confirm the seeded tiers are right, or send tweaks.

## 5. Anything I got stuck on
See the bottom of `docs/OVERNIGHT_LOG.md` — I'll list any specific questions or blockers there.

## 6. Security hardening (reviewed, with me)
- [ ] Turn on **DB-enforced Neon RLS** as defence-in-depth (plan in `OVERNIGHT_LOG.md`). Needs a custom DB role, a driver swap for the user-facing layer, and a two-org isolation test. App-level tenancy is already enforced, so this is hardening, not a hole.
