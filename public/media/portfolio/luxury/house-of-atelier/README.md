# house-of-atelier — luxury project

Drop this project's media here, then reference the paths in `data/projects.ts`
(find the object with `slug: "house-of-atelier"`).

## Files to add
### Cover
- cover.jpg      → /media/portfolio/luxury/house-of-atelier/cover.jpg  (still image cover)

### Gallery
- gallery-1.jpg   → /media/portfolio/luxury/house-of-atelier/gallery-1.jpg
- gallery-2.jpg   → /media/portfolio/luxury/house-of-atelier/gallery-2.jpg
- gallery-3.jpg   → /media/portfolio/luxury/house-of-atelier/gallery-3.jpg

## How to wire it up (data/projects.ts)
Set the `src` (images) or `videoSrc` + `poster` (video) on this project:

```ts
cover: { kind: "image", src: "/media/portfolio/luxury/house-of-atelier/cover.jpg", alt: "Descriptive alt text" },
gallery: [
  { kind: "image", src: "/media/portfolio/luxury/house-of-atelier/gallery-1.jpg", alt: "…" },
  // …
],
// video (if used):
// video: { kind: "video", videoSrc: "/media/portfolio/luxury/house-of-atelier/film.mp4", poster: "/media/portfolio/luxury/house-of-atelier/film-poster.jpg", alt: "…" },
```

Filenames are just suggestions — use anything, as long as the path in
data/projects.ts matches exactly (case-sensitive).
