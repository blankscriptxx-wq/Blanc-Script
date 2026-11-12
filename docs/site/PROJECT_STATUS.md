# Blanc Script — Project Status

Handover notes reconstructed from the original build chat (13 Jul – 29 Oct 2026).
Update this file when something changes, so the next session starts from the right place.

## Where things stand

- **Live site:** Next.js 14 + TypeScript + Tailwind + Framer Motion, deployed on Vercel.
- **Production branch:** `claude/blanc-script-website-imdtr1`. Vercel deploys every push to it.
  There is no `main` branch. The `vercel/*` branches were made by Vercel's GitHub app and can be ignored.
- **Last site commit:** `3ff4b13` (14 Jul): Argeela Food/Decor moved to Bunny; homepage "Work that stands out" redesigned.
- **Domain:** blancscript.com · **Phone:** +44 7939 138551 · **Inbox:** hello@blancscript.com

## Done

| Area | Status |
|---|---|
| Pages | Home, Services, Portfolio + case studies, About, Contact, Privacy, Terms, 404 |
| Content | Everything lives in `data/` (projects, stats, industries, testimonials, team, site) |
| Stats | Real numbers; title "Results that speak for themselves." `value` must be a plain number, letters go in `suffix` (e.g. `value: 2, suffix: "k+"`) |
| Industries | Record Labels added; Luxury and Personal Brands removed |
| Team | HIDDEN on About page (`showTeam = false` in `data/team.ts`; set `true` to restore). Ibrahim Ali (Co-Founder & Brand Strategy Director), Noman Ahmed (Co-Founder & Creative Director). Photos are `public/media/Ibrahim.jpg` and `Noman.jpg`; file names are case-sensitive |
| Booking | Calendly link set in `data/site.ts` |
| Enquiry form | Sent from the visitor's browser to Web3Forms, which emails hello@blancscript.com. Tested and working on the live site. Server-side sending is blocked on Web3Forms' free plan; HubSpot and FormSubmit were tried and dropped |
| Video | Every video plays in the Bunny Stream player with no Bunny branding (library `704454`, CDN `vz-da9d131d-3ff.b-cdn.net`); no YouTube left. 26 projects |
| Homepage | Awakening 25th Anniversary is the hero showreel. "Work that stands out": Srebrenica (wide, lead), Urus Performante and Argeela — Vibe (vertical) |
| Titles | Huracán Performante, Urus Performante, Harris J in Qatar, Maulana Tariq Jamil. Descriptions are playful, except Srebrenica, MTJ and Dr Ilyasah Shabazz, which stay dignified |
| Thumbnails | Bunny only allows thumbnails on blancscript.com, www and the Vercel URL. They look blank in sandbox previews; that's expected |

## AI agent (18 Jul)

- Main instructions written: context, role, workflow, scenarios, limits.
- 9 knowledge-source `.docx` files delivered (BS_KS_1 to BS_KS_9): company info, services,
  portfolio and industries, pricing and engagement, process, FAQs, recommendation engine, sales playbook,
  policies and boundaries.

## Open / waiting on Ibrahim

1. **Video hosting:** decided to stay on Bunny (Nov 2026).
1. **Agent pricing (BS_KS_4):** give indicative price ranges, or keep "quote to scope".
2. **Agent policies (BS_KS_9):** deposit %, cancellation/reschedule notice, revision rounds, usage rights.
3. **Knowledge base in the repo:** whether to add the 9 docs under `docs/knowledge-base/`.
4. **Social URLs:** TikTok, LinkedIn and YouTube in `data/site.ts` are still placeholders.
5. **Stats and testimonials headers:** the comment blocks still say PLACEHOLDER. Confirm the content is final.
6. **Client names** for Audi R8 and the food reels are not set; that row is hidden until they are.
7. Optional: analytics ID, a legal review of Privacy/Terms.

## How to add a video

Upload it to Bunny Stream library 704454, send its GUID and the project name, and it gets added to `data/projects.ts`.
