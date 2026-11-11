# Blanc Script — Brand Pack

The core brand assets and rules, pulled together from what's in the repo. These are
the single source of truth for the marketing site, Blanc Script OS and anything else.

## Assets in this folder
- `blanc-script-logo.png` — primary stacked logo ("BLANC" / "SCRIPT." + teal underline), on transparent background.
- `favicon.svg` — app/browser mark (monogram).
- The **wordmark** is also rendered as live type (see `components/layout/Wordmark.tsx` on the site): `BlancScript.` in Sora ExtraBold, uppercase — "Blanc" in ink, "Script" in coral, full-stop in teal.

> We hold a raster (PNG) logo and the type-based wordmark. If you want a **vector (SVG) master** of the full logo (including the brush underline) for print/large format, say the word and I'll produce one.

## Colours

| Role | Name | Hex |
|---|---|---|
| Primary action / "Script" | **Coral** | `#E8375B` |
| Secondary / underline / dot | **Teal** | `#40B6BA` |
| Ink / "Blanc" / text | **Charcoal** | `#343D3A` |
| Charcoal — deep | | `#22292A` |
| Charcoal — ink (near-black) | | `#1B201F` |
| Warmth / light surfaces | **Cream** | `#F1E7DE` |
| Highlight / pending | **Gold** | `#EFA93A` |

**Usage rules**
- **Coral** is the primary action colour (buttons, key accents, the "SCRIPT" in the logo). Use it as punctuation, not for body text.
- **Teal** is the secondary accent — the signature brushstroke/underline and the full-stop. Also info/selected states.
- **Charcoal** is the main ink on light; it's the dark surface colour too.
- **Cream** is brand warmth — big backgrounds on the marketing site; used sparingly in the OS (auth screens, accents).
- **Gold** is a rare highlight / warnings.
- For interface use, teal and gold are darkened for accessible contrast (see `os/docs/DESIGN_SYSTEM.md` / the OS `--bs-*` tokens). Don't put raw teal/gold as small text on white.

## Typography

| Role | Family | Notes |
|---|---|---|
| Display / logo / titles | **Sora** (700–800) | The brand face. Uppercase, tight tracking for the wordmark. |
| Body / UI | **Inter** | Workhorse; tabular numerals for figures. |
| Editorial / accent | **Fraunces** (italic) | Rare human moments — pull quotes, empty states, intros. |
| Monospace | **Geist Mono** | IDs, amounts, keys (OS). |

All are Google Fonts (free). The marketing site loads a wider set; the brand core is **Sora + Inter + Fraunces**.

## Logo usage
- **Clear space:** keep at least the height of the "B" clear on all sides.
- **Minimum size:** don't render the stacked logo below ~120px wide (it loses the underline detail); use the monogram (`favicon.svg`) for small/square placements.
- **Backgrounds:** use the colour logo on cream/white/light. On charcoal, use a light/knockout version (the "BLANC" switches to cream). Keep strong contrast.
- **Don't:** recolour "SCRIPT" away from coral, stretch/skew, add shadows/outlines, or place on a busy photo without a scrim.

## Voice & tone
Confident, premium, modern, warm, concise, human. **British English.** Short, clear sentences. Avoid clichés ("passionate", "one-stop shop", "cutting-edge", "elevate your brand", "bring your vision to life") and hard-sell pressure. The idea: *every great brand starts with a Blanc Script — strategy first, then craft.*

## Where this lives
- Marketing site brand code: `data/site.ts`, `app/globals.css`, `components/layout/Wordmark.tsx` (on the `claude/blanc-script-website-imdtr1` branch).
- OS design tokens (interface-tuned): `os/docs/DESIGN_SYSTEM.md` and the running `--bs-*` variables in Blanc Script OS.
