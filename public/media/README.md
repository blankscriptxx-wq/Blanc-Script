# Media assets

All site images/videos live here. Reference them from `data/` or components by
their `/media/...` path (case-sensitive), e.g.
`src: "/media/portfolio/automotive/midnight-drive/cover.jpg"`.

## Structure
```
media/
  Ibrahim.jpg, Noman.jpg     ← founder portraits (About page)
  hero/                      ← homepage showreel  (see hero/README.md)
  about/                     ← About story + behind-the-scenes
  portfolio/                 ← all portfolio work, one folder per category
    automotive/  hospitality/  food/  events/  luxury/  social-media/  campaigns/
      <project-slug>/        ← each project's cover, gallery and film
```

Each folder has its own README with the exact filenames and the `src` paths to
paste into the data files. Start with `portfolio/README.md`.

## Quick rules
- Images: JPG/WebP, compressed. Videos: muted H.264 MP4 + a poster image.
- Covers — vertical/social 9:16, cinematic 16:9, square 1:1.
- Always set real `alt` text where the data asks for it.
