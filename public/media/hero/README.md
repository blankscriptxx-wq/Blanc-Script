# Hero showreel

The homepage hero shows a placeholder "Showreel". To use a real one:

- showreel.mp4        → /media/hero/showreel.mp4  (muted, looped, ideally <10s loop or a short reel)
- showreel-poster.jpg → /media/hero/showreel-poster.jpg  (shown before video loads)

Wire it in `components/sections/Hero.tsx` — change the MediaPlaceholder `media`:
```ts
media={{ kind: "video", videoSrc: "/media/hero/showreel.mp4", poster: "/media/hero/showreel-poster.jpg" }}
```
Keep it short and compressed (H.264 MP4) for fast mobile loading.
