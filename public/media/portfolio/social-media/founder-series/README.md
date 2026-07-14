# founder-series — social-media project

Drop this project's media here, then reference the paths in `data/projects.ts`
(find the object with `slug: "founder-series"`).

## Files to add
### Cover
- cover.mp4      → /media/portfolio/social-media/founder-series/cover.mp4  (muted, looped video cover)
- cover-poster.jpg → /media/portfolio/social-media/founder-series/cover-poster.jpg  (poster shown before the video loads)

### Gallery
- gallery-1.jpg   → /media/portfolio/social-media/founder-series/gallery-1.jpg
- gallery-2.jpg   → /media/portfolio/social-media/founder-series/gallery-2.jpg

## How to wire it up (data/projects.ts)
Set the `src` (images) or `videoSrc` + `poster` (video) on this project:

```ts
cover: { kind: "image", src: "/media/portfolio/social-media/founder-series/cover.jpg", alt: "Descriptive alt text" },
gallery: [
  { kind: "image", src: "/media/portfolio/social-media/founder-series/gallery-1.jpg", alt: "…" },
  // …
],
// video (if used):
// video: { kind: "video", videoSrc: "/media/portfolio/social-media/founder-series/film.mp4", poster: "/media/portfolio/social-media/founder-series/film-poster.jpg", alt: "…" },
```

Filenames are just suggestions — use anything, as long as the path in
data/projects.ts matches exactly (case-sensitive).
