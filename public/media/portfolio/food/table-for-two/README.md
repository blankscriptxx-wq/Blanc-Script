# table-for-two — food project

Drop this project's media here, then reference the paths in `data/projects.ts`
(find the object with `slug: "table-for-two"`).

## Files to add
### Cover
- cover.jpg      → /media/portfolio/food/table-for-two/cover.jpg  (still image cover)

### Gallery
- gallery-1.jpg   → /media/portfolio/food/table-for-two/gallery-1.jpg
- gallery-2.jpg   → /media/portfolio/food/table-for-two/gallery-2.jpg
- gallery-3.jpg   → /media/portfolio/food/table-for-two/gallery-3.jpg

## How to wire it up (data/projects.ts)
Set the `src` (images) or `videoSrc` + `poster` (video) on this project:

```ts
cover: { kind: "image", src: "/media/portfolio/food/table-for-two/cover.jpg", alt: "Descriptive alt text" },
gallery: [
  { kind: "image", src: "/media/portfolio/food/table-for-two/gallery-1.jpg", alt: "…" },
  // …
],
// video (if used):
// video: { kind: "video", videoSrc: "/media/portfolio/food/table-for-two/film.mp4", poster: "/media/portfolio/food/table-for-two/film-poster.jpg", alt: "…" },
```

Filenames are just suggestions — use anything, as long as the path in
data/projects.ts matches exactly (case-sensitive).
