# Portfolio media

One folder per category, and inside it one folder per project. Each project
folder has its own README telling you exactly which files to add and the paths
to paste into `data/projects.ts`.

## Categories → projects
- automotive/     → midnight-drive
- food/           → table-for-two
- hospitality/    → opening-night
- luxury/         → house-of-atelier
- events/         → festival-cut
- social-media/   → founder-series, city-escape
- campaigns/      → season-of-us

## Adding a NEW project
1. Add its object to `data/projects.ts` (copy an existing one; set a unique `slug`
   and a `category` from: Automotive, Hospitality, Food, Events, Luxury,
   Social Media, Campaigns).
2. Create a folder here: `portfolio/<category>/<slug>/` and drop its media in.
3. Point the project's `cover` / `gallery` / `video` at those paths.
The portfolio page, filters and case-study page are generated automatically.

## Image guidance
- Vertical/social covers: 9:16 · Cinematic covers: 16:9 · Square: 1:1
- Export JPG/WebP, reasonably compressed. Videos: H.264 MP4, muted.
- Always give real `alt` text in data/projects.ts (accessibility + SEO).
