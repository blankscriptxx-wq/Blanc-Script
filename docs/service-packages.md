# Blanc Script — Service Packages & Pricing (source of truth)

From the owner's "Social Media Content & Pricing" deck (11 Nov 2026). Seeds the
`service_plans` / add-ons model (M2). **All packages are customisable and adapted
per client** — so a client's live plan may override the base tier's volumes and
price (modelled as `client_services` overriding a `service_plan`; see bottom).

Billing: **monthly, rolling** after any minimum term. Weekly figures are a comparison
anchor; billing is monthly. **All prices exclude VAT.**

## Content packages

| Plan | £/mo | £/wk anchor | Shoot visits | Videos/wk | Photo posts/wk | Total posts/mo | Cinematic/3mo | Photography | Caption | Scheduling | Analytics | AI Inbox |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **STILLS** (photography only) | 200 | 50 | 1 / 2mo | — | 3 | 12 | — | ✓ | ✓ | ✓ | — | — |
| **ON AIR** | 460 | 115 | 1 / 2mo | 2 | — | 8 | — | — | ✓ | ✓ | — | — |
| **PRIME TIME** ⭐ most popular | 900 | 225 | 1 / mo | 3 | 1 | 16 | 1 | ✓ | ✓ | ✓ | ✓ | — |
| **HEADLINE** | 1,720 | 430 | 2 / mo | 4 | 2 | 24 | 2 | ✓ | ✓ | ✓ | ✓ | ✓ (incl.) |
| **OFF-SCRIPT** | Bespoke | — | custom | custom | custom | custom | custom | ✓ | ✓ | ✓ | ✓ | optional |

**STILLS** — photography only; food/aesthetic stills; 12 photo posts/mo (3/wk); caption copywriting; scheduling & publishing; 1 visit / 2 months.
**ON AIR** — 2 videos/wk (8/mo); UGC-style short-form; caption copywriting; scheduling & publishing; 1 visit / 2 months.
**PRIME TIME** — 4 posts/wk (3 video + 1 photo); cinematic UGC + 1 cinematic / 3 mo; photography included; caption & scheduling; analytics & reporting; 1 visit / month.
**HEADLINE** — 6 posts/wk (4 video + 2 photo); cinematic UGC + 2 cinematic / 3 mo; photography; caption & scheduling; analytics & reporting; **AI Inbox included**; 2 visits / month.
**OFF-SCRIPT** — bespoke, multi-brand: everything in Headline scaled; multiple brands/locations; dedicated creative direction; custom volume & cinematic output; priced to scope.

## Add-ons & extras (bolt on, or standalone)

| Add-on | Price | Notes |
|---|---|---|
| Paid Ads Management | £350 / mo | Meta & TikTok strategy/setup/optimisation + monthly report; ad spend billed separately by the platform |
| AI Inbox | £120 / mo | Aniro AI set up & trained; answers DMs 24/7, FAQs, captures leads. **Free with Headline** |
| Website Content Pack | £450 one-off | Hero video + photo set, shot on site, formatted for web; one visit |
| Google Business Profile | £75 / mo | Content posted to Google Business (local search/maps) |
| SEO Website Content | £200 / mo | Keyword-researched, structured copy; 2 pieces / month |
| Email Newsletter | £150 / mo | Monthly branded email built from your content |
| Website Development | from £750 | Modern, search-optimised site; scoped |
| Design & Print | competitive, per job | Menus, banners, posters, flyers, signage |
| Actors / Talent | £40–50 / hour | On-camera talent; rate depends on brief |
| Custom Software | Bespoke | Web apps, booking systems, internal tools, automations; scoped per project |

## Glossary (what each term means)
- **UGC-style video** — native, phone-shot short-form for Reels/TikTok.
- **Cinematic production** — higher-end directed & graded hero piece, once per quarter.
- **Photography** — professional stills for feed & stories.
- **Shoot visits** — how often Blanc Script films; one visit banks content for the period.
- **Analytics & reporting** — monthly summary of reach/growth + what to double down on.
- **AI Inbox** — Aniro-AI-powered inbox answering DMs 24/7 and capturing leads.

## Process (How it works)
Choose → Onboard (kick-off call) → Shoot (one visit banks the period) → Deliver (edited, graded, captioned, scheduled) → Review (monthly reporting).

## Data-model mapping (for the retainers module, M2)
- `service_plans` — one row per content package (STILLS, ON AIR, PRIME TIME, HEADLINE, OFF-SCRIPT): base `price_pence`, `billing` = monthly, flags/volumes (videos_per_week, photo_posts_per_week, total_posts_per_month, shoot_visits, cinematic_per_quarter, includes_photography/caption/scheduling/analytics/ai_inbox). OFF-SCRIPT = `bespoke: true`.
- `add_ons` — the extras table (price, cadence one-off/monthly/hourly/per-job/bespoke, `free_with_plan` for AI Inbox + Headline).
- `client_services` — a client's **live** subscription: references a `service_plan`, but carries **per-client overrides** (custom volumes, custom price, notes) + chosen add-ons. This is where "all packages can be customised per client" lives.
- Each client's plan drives the **monthly playbook** (auto-generated tasks: shoot visit(s), posts to hit, cinematic when due, report, AI-inbox check).
- All money in **pence, ex-VAT**; VAT applied at invoicing (D-finance).
