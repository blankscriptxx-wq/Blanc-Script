# Blanc Script — Website

A premium, mobile-first marketing website for **Blanc Script**, a strategy-led
creative agency in Birmingham (working nationwide and internationally).

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**,
**Framer Motion** and **Lucide** icons. Light-led editorial design using the
full brand palette, with cinematic charcoal sections for contrast.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
```

> **Node 18.17+ required** (Node 20/22 recommended).

---

## Project structure

```
app/                      # Routes (App Router)
  layout.tsx              # Fonts, global chrome, base metadata, Org/WebSite JSON-LD
  page.tsx                # Home (13 sections)
  services/               # Services page
  portfolio/              # Portfolio + [slug] case studies
  about/  contact/        # About + Contact (enquiry form)
  privacy-policy/  terms/ # Legal pages
  api/enquiry/route.ts    # Enquiry form endpoint (stub — connect your CRM)
  opengraph-image.tsx     # Auto-generated 1200×630 OG image (PNG)
  sitemap.ts  robots.ts  manifest.ts
  globals.css             # Design-system base layer

components/
  layout/                 # Navbar, MobileMenu, Footer, ScrollProgress, CustomCursor, …
  sections/               # Home sections (Hero, ServicesOverview, Process, …)
  services/  portfolio/   # Service + project building blocks (reusable cards, case study)
  ui/                     # Primitives (Button, Reveal, SectionHeading, MediaPlaceholder, …)
  forms/                  # ContactForm, NewsletterForm
  seo/                    # JSON-LD schema helpers
  analytics/              # Analytics + CookieConsent placeholders

data/                     # ← ALL editable content lives here
  site.ts                 # Brand, contact details, social links, location
  navigation.ts           # Nav + footer links + CTAs
  services.ts             # The 6 services + engagement models
  projects.ts             # Portfolio projects / case studies
  testimonials.ts  stats.ts  team.ts  faqs.ts  industries.ts  process.ts
  seo.ts                  # Per-page SEO config + buildMetadata()
  types.ts                # Shared content types

lib/                      # utils + Framer Motion variants
public/                   # Logo, favicon, media (add your assets here)
```

**Content is data-driven.** You rarely need to touch components — edit the files
in `data/` and the site updates everywhere.

---

## Replacing placeholder content

### Text & contact details
- **Brand, contact, social, location:** `data/site.ts`
  (email, phone, booking link, Instagram is real — TikTok/LinkedIn/YouTube are placeholders).
- **Navigation / CTAs:** `data/navigation.ts`
- **SEO copy + domain:** `data/seo.ts` and `NEXT_PUBLIC_SITE_URL` (see below).

### Media (images & video)
All media renders through `components/ui/MediaPlaceholder.tsx`. Until you add a
real asset it shows an on-brand placeholder marked **“Replace media.”**

To add real media, edit the relevant `MediaRef` in `data/`:

```ts
// Image
cover: { kind: "image", src: "/media/midnight-drive.jpg", alt: "Descriptive alt text" }

// Video (muted, looped, lazy, with poster — never autoplays with sound)
cover: { kind: "video", videoSrc: "/media/reel.mp4", poster: "/media/reel-poster.jpg", alt: "…" }
```

- Put files in `public/media/` (or a CDN — then whitelist the host in
  `next.config.mjs → images.remotePatterns`).
- Use **9:16** for vertical social clips, **16:9/16:10** for cinematic pieces.
- Always provide `alt` text for images (accessibility + SEO).
- Provide a `poster` for every video so there’s no blank frame while it loads.

### Portfolio / case studies
Edit `data/projects.ts`. Each project object automatically generates:
its portfolio card, filter category, and a full case-study page at
`/portfolio/<slug>`. Set `featured: true` to surface it on the homepage.

### Services, testimonials, team, stats, FAQs
One file each in `data/`. Every placeholder (client names, testimonials,
results) is clearly marked — see the checklist at the bottom.

---

## Analytics, Pixel & Search Console

`components/analytics/Analytics.tsx` loads GA4 and the Meta Pixel **only when
their env vars are set** (nothing loads otherwise):

```bash
# .env.local
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=1234567890
```

**Google Search Console:** verify via DNS, or uncomment `metadata.verification`
in `app/layout.tsx` and paste your token. `sitemap.xml` and `robots.txt` are
generated automatically — submit `https://yourdomain.com/sitemap.xml` in GSC.

A minimal cookie-consent banner lives in `components/analytics/CookieConsent.tsx`.
For strict compliance, gate the analytics scripts behind the stored consent value.

---

## Enquiry form (emails to your inbox)

The form (`components/forms/ContactForm.tsx`) submits **directly to Web3Forms
from the browser** (free form-to-email services only accept client-side
requests on their free tier). Each enquiry is emailed to the address tied to the
Web3Forms access key — currently **hello@blancscript.com** — with **reply-to**
set to the enquirer so you can reply straight from the email.

- **The access key** lives in `components/forms/ContactForm.tsx` (`WEB3FORMS_KEY`).
  It's public by design — it only ever emails the one address it's tied to, and
  Web3Forms handles spam filtering. Override it without touching code by setting
  `NEXT_PUBLIC_WEB3FORMS_KEY`.
- **Change destination address / rotate the key:** manage it at **web3forms.com**
  (it's tied to your email there), then update the key here.
- **Prefer another provider?** Point the form's `fetch()` at Resend / SendGrid /
  your own endpoint — the validation, loading, success and error states stay the
  same.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → import the repo.** Framework auto-detects as Next.js.
3. Add environment variables (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SITE_URL` = your production URL (e.g. `https://www.blancscript.com`)
   - `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `ENQUIRY_WEBHOOK_URL` (optional)
4. **Deploy.** Build command `next build` and output are auto-configured.

### Custom domain
Vercel → Project → **Settings → Domains → Add** `blancscript.com` (and `www`).
Point your registrar’s DNS as Vercel instructs (A / CNAME, or nameservers).
After it resolves, set `NEXT_PUBLIC_SITE_URL` to the final URL and redeploy so
canonical URLs, the sitemap and OG tags use the correct domain.

---

## Accessibility & performance

- Semantic HTML, labelled forms, ARIA on interactive components, visible focus rings.
- Keyboard-operable nav, mobile menu (focus trap + scroll lock), accordions and carousels.
- Respects `prefers-reduced-motion`; the site is fully usable with JS/animation disabled.
- `next/font` (zero layout shift), lazy media with posters, `overflow-x` guarded globally,
  code-split routes. Verified: no horizontal overflow at 360 / 390 / 768 / 1280 / 1920px.

---

## Placeholder checklist (replace before launch)

- [ ] **Domain** — `data/site.ts` `url` + `NEXT_PUBLIC_SITE_URL`
- [ ] **Contact** — email, phone (`phone` + `phoneHref`), booking/discovery-call link (`data/site.ts`)
- [ ] **Social links** — TikTok / LinkedIn / YouTube URLs (`data/site.ts`; Instagram already set)
- [ ] **Portfolio** — real projects, client names, results & media (`data/projects.ts`)
- [ ] **Testimonials** — real, attributed quotes with permission (`data/testimonials.ts`)
- [ ] **Results/stats** — verified numbers, currently `0` placeholders (`data/stats.ts`)
- [ ] **Team** — names, roles, bios, portraits (`data/team.ts`)
- [ ] **All media** — every `MediaRef` showing “Replace media” (search the code for `data-placeholder`)
- [ ] **Legal pages** — have a solicitor review `privacy-policy` and `terms` (template wording)
- [ ] **OG image** — auto-generated in `app/opengraph-image.tsx`; customise if desired
- [ ] **Analytics** — set GA / Pixel env vars; verify Search Console
- [ ] **Enquiry form** — connect a CRM/email destination (`app/api/enquiry/route.ts`)

---

Every great brand starts with a Blanc Script.
