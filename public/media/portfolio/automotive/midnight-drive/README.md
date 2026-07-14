# midnight-drive — automotive project

Drop this project's media here, then reference the paths in `data/projects.ts`
(find the object with `slug: "midnight-drive"`).

## Files to add
### Cover
- cover.mp4      → /media/portfolio/automotive/midnight-drive/cover.mp4  (muted, looped video cover)
- cover-poster.jpg → /media/portfolio/automotive/midnight-drive/cover-poster.jpg  (poster shown before the video loads)

### Gallery
- gallery-1.jpg   → /media/portfolio/automotive/midnight-drive/gallery-1.jpg
- gallery-2.jpg   → /media/portfolio/automotive/midnight-drive/gallery-2.jpg
- gallery-3.jpg   → /media/portfolio/automotive/midnight-drive/gallery-3.jpg

### Case-study film (optional)
- film.mp4        → /media/portfolio/automotive/midnight-drive/film.mp4
- film-poster.jpg → /media/portfolio/automotive/midnight-drive/film-poster.jpg

## How to wire it up (data/projects.ts)
Set the `src` (images) or `videoSrc` + `poster` (video) on this project:

```ts
cover: { kind: "image", src: "/media/portfolio/automotive/midnight-drive/cover.jpg", alt: "Descriptive alt text" },
gallery: [
  { kind: "image", src: "/media/portfolio/automotive/midnight-drive/gallery-1.jpg", alt: "…" },
  // …
],
// video (if used):
// video: { kind: "video", videoSrc: "/media/portfolio/automotive/midnight-drive/film.mp4", poster: "/media/portfolio/automotive/midnight-drive/film-poster.jpg", alt: "…" },
```

Filenames are just suggestions — use anything, as long as the path in
data/projects.ts matches exactly (case-sensitive).
