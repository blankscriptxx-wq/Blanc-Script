# festival-cut — events project

Drop this project's media here, then reference the paths in `data/projects.ts`
(find the object with `slug: "festival-cut"`).

## Files to add
### Cover
- cover.mp4      → /media/portfolio/events/festival-cut/cover.mp4  (muted, looped video cover)
- cover-poster.jpg → /media/portfolio/events/festival-cut/cover-poster.jpg  (poster shown before the video loads)

### Gallery
- gallery-1.jpg   → /media/portfolio/events/festival-cut/gallery-1.jpg
- gallery-2.jpg   → /media/portfolio/events/festival-cut/gallery-2.jpg

### Case-study film (optional)
- film.mp4        → /media/portfolio/events/festival-cut/film.mp4
- film-poster.jpg → /media/portfolio/events/festival-cut/film-poster.jpg

## How to wire it up (data/projects.ts)
Set the `src` (images) or `videoSrc` + `poster` (video) on this project:

```ts
cover: { kind: "image", src: "/media/portfolio/events/festival-cut/cover.jpg", alt: "Descriptive alt text" },
gallery: [
  { kind: "image", src: "/media/portfolio/events/festival-cut/gallery-1.jpg", alt: "…" },
  // …
],
// video (if used):
// video: { kind: "video", videoSrc: "/media/portfolio/events/festival-cut/film.mp4", poster: "/media/portfolio/events/festival-cut/film-poster.jpg", alt: "…" },
```

Filenames are just suggestions — use anything, as long as the path in
data/projects.ts matches exactly (case-sensitive).
