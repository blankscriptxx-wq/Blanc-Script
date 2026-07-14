# season-of-us — campaigns project

Drop this project's media here, then reference the paths in `data/projects.ts`
(find the object with `slug: "season-of-us"`).

## Files to add
### Cover
- cover.jpg      → /media/portfolio/campaigns/season-of-us/cover.jpg  (still image cover)

### Gallery
- gallery-1.jpg   → /media/portfolio/campaigns/season-of-us/gallery-1.jpg
- gallery-2.jpg   → /media/portfolio/campaigns/season-of-us/gallery-2.jpg
- gallery-3.jpg   → /media/portfolio/campaigns/season-of-us/gallery-3.jpg

### Case-study film (optional)
- film.mp4        → /media/portfolio/campaigns/season-of-us/film.mp4
- film-poster.jpg → /media/portfolio/campaigns/season-of-us/film-poster.jpg

## How to wire it up (data/projects.ts)
Set the `src` (images) or `videoSrc` + `poster` (video) on this project:

```ts
cover: { kind: "image", src: "/media/portfolio/campaigns/season-of-us/cover.jpg", alt: "Descriptive alt text" },
gallery: [
  { kind: "image", src: "/media/portfolio/campaigns/season-of-us/gallery-1.jpg", alt: "…" },
  // …
],
// video (if used):
// video: { kind: "video", videoSrc: "/media/portfolio/campaigns/season-of-us/film.mp4", poster: "/media/portfolio/campaigns/season-of-us/film-poster.jpg", alt: "…" },
```

Filenames are just suggestions — use anything, as long as the path in
data/projects.ts matches exactly (case-sensitive).
