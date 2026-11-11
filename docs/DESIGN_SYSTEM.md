# Blanc Script OS — Design System

**Status:** Planned (v0). This document defines the UI/UX and design-system plan for Blanc Script OS.
**Owner:** UI/UX & Design Systems Architect.
**Consumes:** `os/docs/_FOUNDATION.md` (locked stack, roles, systems, milestones) and `docs/centauri-crm-analysis.md` (problem space).
**Does not define:** database schema, system architecture, or the technical stack — those are owned elsewhere per the Foundation §6. Everything here is **planned**; nothing is implemented yet.

British English throughout. shadcn/ui + Tailwind CSS are **locked** (Foundation §1) and are the substrate for everything below. Framer Motion is used sparingly. Icons are Lucide.

> **How to read this.** Token tables are the contract. Components are described as a build plan on top of shadcn/ui primitives, not as finished code. Where a decision needs the Lead Architect, it is flagged **[LEAD DECISION]** and collected in the final section.

---

## 1. Design principles

Blanc Script OS is a **dense, fast, multi-user productivity tool** for a creative production agency — not a generic admin dashboard, and not the marketing site. Six principles govern every decision.

1. **Premium, not corporate.** The surface feels considered and expensive: generous-but-disciplined spacing, real typographic hierarchy, restraint with colour. We never ship the default Bootstrap-grey SaaS look.
2. **Minimal and calm.** Chrome recedes; content leads. One primary action per view, muted neutrals, accent colour used as punctuation. A busy agency day is stressful enough — the tool should lower the temperature.
3. **Editorial.** Inherited from the brand: confident type, a clear grid, meaningful whitespace, the occasional serif italic for a human moment (section intros, empty states, AI voice). The OS reads like a well-set magazine spread repurposed for work.
4. **Fast — information-dense where it counts.** This is the key departure from the marketing site. Operators live here all day across CRM, shoots, edits, finance. Tables are tight, rows are scannable, the command palette is the fastest path, and nothing animates longer than it needs to. Density is a feature.
5. **Legible and accessible by default.** WCAG 2.2 AA minimum, full keyboard operation, visible focus, `prefers-reduced-motion` honoured. Accessibility is not a layer added later; it is the baseline (Foundation §7 requires responsive + states on every feature).
6. **Honest.** No dead buttons, no fake data, no decorative charts over empty tables. Every state — loading, empty, error, permission-denied — is designed (Foundation §2, §7). The UI tells the truth about what the system knows and what the current user is allowed to do.

**Anti-patterns we explicitly reject:** kitchen-sink dashboards of 12 widgets nobody reads; rainbow status colours; modal-on-modal; infinite nested settings; hover-only affordances; motion that blocks input; and any control that appears regardless of the user's role + capabilities (Foundation §3).

---

## 2. Relationship to the marketing site

The marketing site (`blancscript.com`) and the OS share a **brand**, not a **design**. They are deliberately distinct surfaces with one visual DNA.

| Dimension | Marketing site (`blancscript.com`) | Blanc Script OS |
|---|---|---|
| Job | Persuade, impress, convert | Operate, decide, get work done |
| Density | Airy, cinematic, one idea per screen | Dense, scannable, many objects per screen |
| Canvas | Cream `#F1E7DE`, big charcoal sections, film grain | Near-white / deep-charcoal app surfaces, no grain |
| Type scale | Huge fluid display (`clamp` up to 11rem) | Compact UI scale (12–30px), display reserved for page titles |
| Colour use | Expressive — coral, teal, gold, cinematic blacks | Reserved — neutral shell, accents as signals only |
| Motion | Scroll reveals, marquees, custom cursor | Micro-interactions only, 120–220ms, no scroll theatre |
| Primary font role | Sora at display sizes | Sora at title sizes only; UI runs on a workhorse sans |

**What carries over (brand continuity):**
- The **palette** — cream, charcoal, coral, teal, gold — re-tuned for interface use (coral stays the primary action colour, exactly as the site's `Button` primary).
- The **type families** — Sora (display), a clean grapheme sans for body, Fraunces for rare editorial/serif moments.
- The **editorial easing** `cubic-bezier(0.22, 1, 0.36, 1)` and the pill/soft-radius language.
- The **44px minimum touch target** and visible coral focus ring already established in `globals.css` and `Button.tsx`.

**What the OS defines for itself** (because a productivity tool has different needs): its own full light **and** dark token sets, a compact spacing/type scale, data-grid and form density rules, elevation for overlays, and semantic status colours. These live in a separate token layer (`--bs-*`, see §3) so the two products can evolve without colliding.

---

## 3. Colour system

### 3.1 Brand anchors (from the brand board)

| Token | Hex | Role in OS |
|---|---|---|
| Cream | `#F1E7DE` | Brand warmth; used sparingly (auth screens, marketing-adjacent surfaces, highlights) — **not** the main app canvas |
| Teal | `#40B6BA` | Secondary accent / info / selected-nav |
| Gold | `#EFA93A` | Rare highlight; warnings/pending |
| Coral | `#E8375B` | **Primary action** + focus ring (brand-critical continuity) |
| Charcoal | `#343D3A` / deep `#22292A` / ink `#1B201F` | Ink on light; surfaces in dark mode |

### 3.2 Why the app canvas is not cream

Cream is beautiful at magazine scale but fatiguing behind dense tables and long work sessions, and it muddies the semantic status colours. The OS canvas is a **near-white warm neutral** in light mode and a **warm charcoal** in dark mode, with cream retained as a deliberate brand accent (auth, empty-state illustrations, the AI panel header). This keeps the OS unmistakably Blanc Script without importing the site's full-cream editorial mood.

### 3.3 Semantic token layer

All OS colour is consumed through **semantic CSS variables** (`--bs-*`), never raw hex in components. Tailwind maps these to utility classes (planned `theme.extend.colors` namespaced `bs`). shadcn/ui's own `--background`/`--foreground`/`--primary` variables are aliased onto this layer so shadcn components inherit the system for free.

**Light mode — `:root`**

```css
:root {
  /* Surfaces */
  --bs-canvas:        #FAF7F3;  /* app background (warm near-white) */
  --bs-surface:       #FFFFFF;  /* cards, panels, table bg */
  --bs-surface-2:     #F3EEE8;  /* sunken wells, table header, hover rows */
  --bs-overlay:       #FFFFFF;  /* popovers, menus, sheets */
  --bs-cream:         #F1E7DE;  /* brand accent surface */

  /* Text */
  --bs-text:          #1B201F;  /* primary ink */
  --bs-text-muted:    #515956;  /* secondary */
  --bs-text-subtle:   #7C847F;  /* tertiary / placeholders */
  --bs-text-on-accent:#FFFFFF;  /* text on coral/teal fills */

  /* Lines */
  --bs-border:        #E4DCD2;  /* hairlines, table grid */
  --bs-border-strong: #C9BFB2;  /* inputs, dividers that must read */
  --bs-ring:          #E8375B;  /* coral focus ring (brand) */

  /* Brand accents */
  --bs-primary:        #E8375B;  /* coral — primary action */
  --bs-primary-hover:  #C82848;
  --bs-primary-soft:   #FBE2E8;  /* coral tint bg */
  --bs-accent:         #2E8E92;  /* teal (darkened for AA on white) */
  --bs-accent-soft:    #DCF0F0;

  /* Semantic / status */
  --bs-success:       #2F8F62;  --bs-success-soft: #DEF1E7;
  --bs-warning:       #B9801F;  --bs-warning-soft: #FBEFD7;  /* gold, darkened for AA */
  --bs-danger:        #C82848;  --bs-danger-soft:  #FBE2E8;
  --bs-info:          #2E8E92;  --bs-info-soft:    #DCF0F0;
  --bs-neutral:       #515956;  --bs-neutral-soft: #ECE7E0;

  /* Data-viz categorical (see §3.5) */
  --bs-viz-1:#2E8E92; --bs-viz-2:#E8375B; --bs-viz-3:#EFA93A;
  --bs-viz-4:#5B6EE1; --bs-viz-5:#8A6FB0; --bs-viz-6:#4A5450;
}
```

**Dark mode — `:root[data-theme="dark"]` (and `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`)**

```css
:root[data-theme="dark"] {
  --bs-canvas:        #151A19;  /* deep warm charcoal */
  --bs-surface:       #1E2423;  /* cards/panels */
  --bs-surface-2:     #272E2C;  /* raised rows, header */
  --bs-overlay:       #272E2C;
  --bs-cream:         #2A2622;  /* muted brand accent in dark */

  --bs-text:          #F2EEE8;
  --bs-text-muted:    #AEB5B1;
  --bs-text-subtle:   #7E867F;
  --bs-text-on-accent:#FFFFFF;

  --bs-border:        #313836;
  --bs-border-strong: #434B48;
  --bs-ring:          #FF5E7D;  /* brightened coral for dark contrast */

  --bs-primary:        #FF5E7D;  /* coral lifted for AA on dark */
  --bs-primary-hover:  #FF7A93;
  --bs-primary-soft:   #3A2429;
  --bs-accent:         #51C8CC;  /* teal lifted */
  --bs-accent-soft:    #16302F;

  --bs-success:#49B883; --bs-success-soft:#15271F;
  --bs-warning:#F0B65A; --bs-warning-soft:#2C2416;
  --bs-danger: #FF6B82; --bs-danger-soft: #30191D;
  --bs-info:   #51C8CC; --bs-info-soft:   #16302F;
  --bs-neutral:#AEB5B1; --bs-neutral-soft:#262C2A;

  --bs-viz-1:#51C8CC; --bs-viz-2:#FF5E7D; --bs-viz-3:#F0B65A;
  --bs-viz-4:#8094F0; --bs-viz-5:#B199D4; --bs-viz-6:#9AA39E;
}
```

Theme is toggled by a `data-theme` attribute on `<html>` (user setting; defaults to system). `body` always sets an explicit `background: var(--bs-canvas)`.

### 3.4 Contrast & accessibility of the palette

All pairings target **WCAG 2.2 AA**: ≥4.5:1 for body text, ≥3:1 for large text (≥18.66px bold / 24px) and UI component boundaries.

- Pure teal `#40B6BA` and gold `#EFA93A` **fail** 4.5:1 as text on white, so the token layer uses darkened variants (`#2E8E92`, `#B9801F`) for text/icons and reserves the bright brand hues for fills and accents where the 3:1 rule applies. This is why the OS does not use raw brand hex for text.
- Coral `#E8375B` on white ≈ 4.0:1 — acceptable for **large**/bold UI text and as a fill with white text (white on coral ≈ 4.5:1), but body-size coral text is avoided; coral is an **action/indicator** colour, not a reading colour.
- Status colours are always paired `--bs-x` (icon/text) + `--bs-x-soft` (background) so a pill reads at AA in both themes.
- **[LEAD DECISION]** Confirm whether we must meet AA only or push selected flows (auth, finance figures) to AAA 7:1.

### 3.5 Data-viz palette

Charts use the `--bs-viz-*` ramp (teal-led, coral second) — categorical up to 6 series, then switch to a sequential teal ramp for >6. Never encode meaning by hue alone; pair with labels/patterns. Full charting rules in §6.14.

---

## 4. Typography

### 4.1 Families (brand pairing, productivity-tuned)

| Role | Family | Rationale |
|---|---|---|
| **Display / page titles** | **Sora** (brand) | Carries the marketing brand into the OS, but only at title sizes — not at body density. |
| **UI / body / tables** | **Inter** (brand body) with **tabular numerals** on | Already the site's body font; superb at small sizes, ships `tnum`/`ss01`, perfect for dense tables and forms. The OS workhorse. |
| **Editorial / AI voice** | **Fraunces** italic (brand) | Rare, human moments: empty-state lines, AI assistant intro, section epigraphs. Never for data. |
| **Monospace** | **Geist Mono** (or `ui-monospace` fallback) | IDs, amounts in ledgers, code/keys, diff of edits. **[LEAD DECISION]** confirm adding one mono family vs system mono. |

Loaded via `next/font` and exposed as `--font-display` (Sora), `--font-sans` (Inter), `--font-serif` (Fraunces), `--font-mono`. Numerals: Inter with `font-feature-settings: "tnum" 1, "cv01" 1` everywhere money, dates or metrics align in columns.

### 4.2 Type scale (compact, UI-first)

Fixed px (not fluid `clamp`) — productivity tools need predictable density. Fluid display is reserved for the handful of true page heroes.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-display` | 30 / 36 | Sora 600 | Page hero titles (Command Centre) |
| `text-h1` | 24 / 32 | Sora 600 | Section/record titles |
| `text-h2` | 20 / 28 | Sora 600 | Card headers, drawer titles |
| `text-h3` | 16 / 24 | Inter 600 | Sub-headers, group labels |
| `text-body` | 14 / 20 | Inter 400 | **Default UI text**, table cells, forms |
| `text-body-strong` | 14 / 20 | Inter 600 | Emphasis, primary cell |
| `text-sm` | 13 / 18 | Inter 400 | Secondary cell, meta |
| `text-xs` | 12 / 16 | Inter 500 | Labels, pills, timestamps, captions |
| `text-eyebrow` | 11 / 14, `0.14em`, uppercase | Inter 600 | Overline labels (echoes site `.eyebrow`, tighter tracking) |
| `text-mono` | 13 / 18 | Geist Mono | IDs, amounts, keys |

Base document size 14px (not 16px) — the density dial for the whole OS; users can scale via a comfortable/compact preference. Minimum rendered text is 12px; nothing smaller.

---

## 5. Spacing, radius, elevation

### 5.1 Spacing scale (4px base)

`0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Tailwind's default scale is kept; the OS adds density tokens:

| Token | px | Use |
|---|---|---|
| `--bs-pad-cell-y` | 8 | Table cell vertical (compact) / 10 comfortable |
| `--bs-pad-cell-x` | 12 | Table cell horizontal |
| `--bs-pad-control` | 8 / 12 | Input & button inner padding |
| `--bs-gap-field` | 16 | Between form fields |
| `--bs-gap-card` | 16 | Between cards in a grid |
| `--bs-pad-panel` | 20 / 24 | Card & drawer inner padding |
| `--bs-shell-gutter` | 16 (mobile) → 24 (desktop) | App content gutter; no horizontal page scroll ever |

Minimum interactive target **44×44px** (brand-continuous), even where the visible control is smaller (hit-area padding).

### 5.2 Radius

Softer than default shadcn, calmer than the site's big pills. `--bs-radius: 10px` base.

| Token | px | Use |
|---|---|---|
| `radius-xs` | 6 | Pills, tags, inline chips |
| `radius-sm` | 8 | Inputs, buttons, menu items |
| `radius-md` | 10 | **Default** — cards, popovers |
| `radius-lg` | 14 | Drawers, modals, large panels |
| `radius-pill` | 999 | Status pills, avatars, filter chips (brand motif) |

### 5.3 Elevation

Elevation is **structural**, not decorative — overlays lift, content stays flat. Shadows are soft and warm-tinted (never pure black); dark mode leans on borders + a subtle lift rather than heavy shadow.

| Token | Light | Dark | Use |
|---|---|---|---|
| `elev-0` | none, `1px` border | none, `1px` border | Flat cards, table |
| `elev-1` | `0 1px 2px rgba(27,32,31,.06)` | `0 1px 2px rgba(0,0,0,.4)` | Resting card hover, sticky header |
| `elev-2` | `0 6px 16px -6px rgba(27,32,31,.14)` | `0 6px 18px -6px rgba(0,0,0,.6)` | Popovers, dropdowns, command palette |
| `elev-3` | `0 20px 48px -16px rgba(27,32,31,.22)` | `0 24px 56px -18px rgba(0,0,0,.7)` | Modals, right-side drawers/sheets |
| `elev-focus` | `0 0 0 3px var(--bs-ring)` outer | same | Focus ring (plus 2px outline) |

---

## 6. Component library plan (on top of shadcn/ui)

**Strategy.** shadcn/ui provides the accessible, unstyled-ish primitives (Radix under the hood); we theme them through the `--bs-*` layer and wrap them in a thin Blanc Script layer (`components/ds/*`) that encodes density, variants and brand. We never fork Radix behaviour; we restyle and compose. Everything below is a **build plan**.

### 6.1 Buttons
- shadcn `Button`, re-skinned. Variants: `primary` (coral fill, white text — matches site), `secondary` (charcoal outline → fill on hover), `ghost` (text, coral on hover), `subtle` (neutral-soft fill), `danger` (coral/red fill), `link`. Sizes: `sm 28px`, `md 36px` (default, dense), `lg 44px`. Icon-only variant is a square with 44px hit-area. States: hover, active (`scale .98`), disabled (40% + no pointer), **loading** (spinner replaces leading icon, label stays, button width locked). One primary per view.

### 6.2 Inputs & forms
- shadcn `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch`, `Slider`, `DatePicker` (Europe/London display), `Label`, `FormField` (react-hook-form + Zod). Height 36px dense. Border `--bs-border-strong`, focus = coral ring + border. Inline validation: error text + `--bs-danger` border + icon, never colour alone. Money inputs: mono tabular, prefix `£`, minor-unit aware (pence). Required/optional marked in the label. Field help as `text-xs` muted below. Multi-column forms on desktop, single on mobile.

### 6.3 Tables & data-grids (the workhorse)
- Built on TanStack Table + shadcn `Table` styling. Two tiers:
  - **Table** — standard lists (clients, invoices, tasks): sticky header (`--bs-surface-2`), 8px dense rows, zebra off by default (hairline rows), row hover `--bs-surface-2`, sortable headers, column-level alignment (text left, numbers right tabular), truncation + tooltip, row selection checkboxes, bulk-action bar on select, per-row kebab menu, pinned first/last columns.
  - **Data-grid** — power views (post tracker, pay-run, media): column resize/reorder/show-hide, grouping, inline edit cells (tab to move), sticky first column, virtualised rows for large sets, saved views/filters, CSV export. Density toggle (compact/comfortable) is a global preference.
- Every table ships **loading** (skeleton rows), **empty** (designed message + primary action), **error** (retry) and **permission-filtered** states. Rows and columns the user's capabilities forbid are hidden, not greyed (e.g. money columns absent without `can_see_money`).

### 6.4 Cards
- `Card` (header/title/meta/body/footer), `StatCard` (metric + label + delta + sparkline — tabular numerals, delta coloured success/danger with arrow + sign), `EntityCard` (avatar/thumb + title + status pill + meta row, used in kanban & lists), `MediaCard` (R2 thumbnail, duration badge, edit-state pill). Flat (`elev-0` + border) by default; hover lifts to `elev-1` only when interactive.

### 6.5 Command palette (command-palette-first)
- shadcn `Command` (cmdk) in a dialog, bound to **⌘K / Ctrl-K** globally. The primary navigation and action surface — echoing Centauri's "Jump anywhere… a client, a shoot, a person, a task, a page". Sections: recent, navigation, records (clients/shoots/edits/invoices/people — scoped to permissions + org via RLS), and **actions** ("New shoot", "Add task", "Draft invoice chase") which respect role + capability and route `popup`/`direct`/`ask` actions exactly like the AI layer. Fuzzy search, keyboard-only, grouped results, inline shortcuts shown. Empty/loading/no-result states designed.

### 6.6 Kanban
- Boards for pipeline (leads), tasks, and edit workflow (Being Edited → Revision Needed → Sent to Client → Ready to Post). Columns with counts + WIP hints, `EntityCard` items, drag-and-drop (dnd-kit), optimistic move with rollback on failure, keyboard reorder (space to lift, arrows, space to drop). Collapsed columns, swimlanes by assignee optional. Touch-friendly on tablet; stacks to a single scrollable column list on mobile.

### 6.7 Calendar
- Month / week / day / agenda views for shoots, tasks, deadlines, meetings (Europe/London). Event chips coloured by type via semantic tokens, not raw hue; density-safe "+N more". Drag to reschedule (optimistic), click to open record drawer. Mobile defaults to agenda list. Shares the data-viz/status token language so a "shoot day" reads consistently with its record elsewhere.

### 6.8 Drawers / sheets & modals
- shadcn `Sheet` (right-side drawer, `elev-3`) is the **primary record-detail pattern** — open a client/shoot/invoice without losing list context; supports stacking one level and a maximise-to-page affordance. `Dialog` (modal) reserved for focused create/confirm flows. Destructive confirms use a dedicated `ConfirmDialog` with the action named in the button ("Cancel shoot"), never a bare "OK". Mobile: sheets become full-height bottom sheets.

### 6.9 Toasts & notifications
- shadcn `Sonner` toasts, bottom-right (bottom-centre mobile): `success`/`info`/`warning`/`error`/`loading→resolved`. Concise, one line + optional action ("Undo"). Non-blocking; never used for form validation. Separate from the **notification centre** (persistent feed of assignments, approvals, overdue items — the "Today" surface). Live updates arrive via the realtime layer; toasts for the current user's own actions, the notification centre for ambient events.

### 6.10 Empty / loading / error / permission states (first-class)
- **Loading:** skeletons that match final layout (never spinners for whole pages); inline spinners only for in-place actions. Content-aware, no layout shift.
- **Empty:** Fraunces-italic one-liner + plain explanation + a single primary action + optional illustration (cream accent). Distinguish "nothing yet" from "nothing matches your filter" (offer clear-filters).
- **Error:** calm, specific, recoverable — what failed, what to do, a retry; technical detail behind a disclosure. Never a raw stack trace.
- **Permission-denied:** explain the capability needed and who to ask, rather than a dead-end 403; where possible the control simply isn't rendered (Foundation §3 — AI and UI act within role + capabilities).

### 6.11 Avatars
- `Avatar` (person photo / initials fallback on a deterministic tinted background from the viz ramp), sizes 20/24/32/40. `AvatarGroup` with overflow "+N" for crews/assignees. Talent and client avatars visually distinguished (a subtle ring/role dot) so staff never confuse a client with talent.

### 6.12 Status pills & badges
- Pill (`radius-pill`, `text-xs`, soft bg + solid text/icon) is the universal status token. Mapped sets per domain, all drawn from semantic tokens:
  - Edit: Being Edited (info), Revision Needed (warning), Sent to Client (neutral), Ready to Post (success).
  - Invoice: Draft (neutral), Sent (info), Approved (accent), Paid (success), Overdue (danger).
  - Lead: New, Proposal Sent, Call Booked, Won (success), Lost (neutral).
  - Shoot: Booked (info), On Site (accent, subtle live pulse — reduced-motion aware), Wrapped (success), Cancelled (neutral).
- Always icon + label (colour never the sole signal). A single `<StatusPill domain tone>` component keeps mapping centralised.

### 6.13 Drag-drop uploads (media)
- Dropzone for footage/stills → R2 signed-upload, with per-file progress, raw/final counts, retry, and thumbnail generation. Large-folder drops supported (echoes Centauri "drag the clips or a whole folder here"). Clear states for uploading/processing/failed.

### 6.14 Charts
- Recharts (or visx) themed to `--bs-viz-*`. Types: line/area (metrics over time — views, followers), bar (posts per week, revenue), sparkline (in StatCards), donut sparingly (budget usage). Rules: tabular numerals, max 6 categorical series then sequential ramp, direct labels over legends where space allows, no 3D, no gratuitous gradients, axis/grid in `--bs-border`, accessible table fallback behind every chart, empty/loading states. Follows the project's dataviz guidance.

### 6.15 Other primitives
Tabs, Breadcrumbs, Pagination, Tooltip (keyboard-reachable), Popover, DropdownMenu, ContextMenu (right-click on rows/cards), Accordion, Progress, Separator, ScrollArea, Resizable panels (for the AI side-panel), Segmented control (view switchers), Filter bar (chips + saved views), Inline-edit text, Copy-to-clipboard, Keyboard-shortcut hint (`kbd`). All shadcn-based, all themed.

---

## 7. App shell & navigation

Command-palette-first, sidebar-anchored, responsive to mobile.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR  [≡] Blanc Script OS   [ ⌘K  Search or jump…        ]  🔔  ✦AI  ⟐ org │
├───────────┬──────────────────────────────────────────────────────────────┤
│ SIDEBAR   │  CONTENT                                                       │
│           │                                                                │
│ ▣ Today   │   Page title + context actions                                │
│ ◻ Clients │   ───────────────────────────────────────────────            │
│ ◻ Projects│   [ main working area: table / board / calendar / record ]    │
│ ◻ Shoots  │                                                                │
│ ◻ Edits   │                                                                │
│ ◻ Content │                                                                │
│ ◻ Finance │                                                                │
│ ◻ Team    │                                                                │
│ ◻ Talent  │                                                                │
│ ─────     │                                                                │
│ ⚙ Settings│                                                      [ ✦ AI   ]│
│ ◐ You     │                                                      [ panel  ]│
└───────────┴──────────────────────────────────────────────────────────────┘
```

- **Topbar:** org/workspace switcher, global ⌘K search (the hero control), notification bell, AI toggle, account menu, theme toggle. Sticky, `elev-1`.
- **Sidebar:** the 10 product systems (Foundation §5) as primary nav, mapped to the current user's role + capabilities (items absent when not permitted). Collapsible to an icon rail (state remembered per user via local preference). Active item uses teal accent + left marker.
- **AI panel:** a resizable right-side panel (Blanc Script AI), opened from topbar or ⌘K, not a floating bubble. Respects role + capabilities; consequential actions require confirmation (Foundation §3).
- **Record detail:** opens as a right **Sheet** over the current list, or as a full page via breadcrumb for deep work.

**Responsive**
- **≥1280 desktop:** full sidebar + optional AI panel side-by-side.
- **768–1279 tablet:** sidebar collapses to icon rail; AI panel overlays; tables keep priority columns, overflow to kebab.
- **<768 mobile:** sidebar → bottom tab bar (Today, Search, +New, Notifications, You) + a "more" sheet; ⌘K → full-screen search; tables → stacked cards or horizontally scrollable priority columns; drawers → bottom sheets. No horizontal page scroll at any width; 16px gutters.

The OS is an installable **PWA** (Foundation §1) with home-screen shortcuts mirroring Centauri's (Today, My shoots, Calendar, AI).

---

## 8. Interaction & motion

Motion is **functional and restrained** — it explains change, it never performs. Framer Motion, used sparingly (Foundation §1).

- **Durations:** micro 120ms, standard 180ms, overlay 220ms. Nothing over 260ms in the working UI.
- **Easing:** `--bs-ease: cubic-bezier(0.22, 1, 0.36, 1)` (brand editorial easing) for enter/move; `ease-out` for exits.
- **Where motion is used:** sheet/drawer slide-in, modal fade+rise, popover/menu fade+scale (from origin), toast slide, row insert/remove (height+fade), optimistic kanban moves, tab underline, skeleton shimmer, status-pill tone change. Numbers in StatCards may count-up once on load (≤400ms, skipped under reduced-motion).
- **Where motion is banned:** scroll-triggered reveals, parallax, decorative looping, cursor effects, anything that delays input or blocks interaction. The marketing site's marquees/custom cursor do **not** come across.
- **Feedback:** every action acknowledges within 100ms (optimistic UI + toast on resolve/rollback). Hover and focus are distinct; active states give a subtle `scale .98` on buttons.
- **`prefers-reduced-motion`:** all non-essential motion → instant opacity/none; the "On Site" live pulse and count-ups disable; functionality unchanged.

---

## 9. Accessibility standards

WCAG 2.2 **AA** is the floor (Foundation §7).

- **Contrast:** text ≥4.5:1, large text & UI boundaries ≥3:1, verified for both themes (see §3.4). Status never by colour alone — always icon/label.
- **Keyboard:** everything operable without a mouse. ⌘K palette is the fast path; logical tab order; arrow-key navigation in menus, tables, kanban, calendar; `Esc` closes overlays; focus trapped in modals/sheets and restored on close. Documented global shortcuts with a `?` cheat-sheet.
- **Focus:** visible on every interactive element — coral `--bs-ring` 3px ring + 2px outline offset (brand-continuous from `globals.css`). Never removed without an equivalent.
- **Semantics:** correct roles/landmarks (`nav`, `main`, `search`), labelled controls, `aria-live` for toasts and realtime updates, table headers associated, accessible names on icon-only buttons. Radix (via shadcn) gives us much of this; we verify it.
- **Forms:** programmatic labels, `aria-invalid` + `aria-describedby` for errors, errors announced, required state conveyed non-visually.
- **Targets:** ≥44×44px (also a 2.2 AA/AAA target-size consideration). **Reduced motion** honoured (§8). Zoom to 200% without loss; respects user font-size up to the density ceiling.
- **Media:** captions/transcripts where applicable; alt text on meaningful imagery; decorative thumbnails marked decorative.
- A planned **a11y checklist** gates every component's "done" (ties into the QA doc's TESTING_STRATEGY).

---

## 10. Iconography

- **Library:** **Lucide** (already in use on the marketing site, e.g. `ArrowUpRight` in `Button.tsx`) — consistent 1.5px stroke, matches the editorial-minimal line.
- **Sizing:** 16px inline/in-text, 18px default control, 20px nav/section, 24px empty-state/feature. Stroke scales with text; icons inherit `currentColor`.
- **Usage:** icons support labels, they rarely replace them (icon-only allowed only for universally understood controls — close, kebab, search — always with an `aria-label`). One icon per concept, mapped centrally (a client is always the same glyph everywhere). Status icons pair with status tokens (§6.12).
- **Brand marks:** the Blanc Script wordmark/monogram and integration logos (Xero, Frame.io, TikTok, etc.) live in a small SVG `brandmarks` set, kept separate from the functional Lucide set. **[LEAD DECISION]** confirm a single icon set (Lucide only) vs allowing a second set for filled/duotone states.

---

## 11. Wireframes (ASCII, indicative)

### 11.1 Command Centre (Today)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Blanc Script OS      [ ⌘K  Search or jump anywhere…        ]  🔔3  ✦AI  BS▾ │
├────────────┬───────────────────────────────────────────────────────────────┤
│ ▣ Today    │  Good morning, Priya          Tue 11 Nov · Birmingham   [+ New]│
│ ◻ Clients  │  ───────────────────────────────────────────────────────────  │
│ ◻ Projects │  ┌ Footage due ─┐ ┌ Edits mine ─┐ ┌ Overdue £ ─┐ ┌ Approvals ┐ │
│ ◻ Shoots   │  │   3          │ │   5         │ │  £4,820 ▲  │ │   2       │ │
│ ◻ Edits    │  │  ▁▃▅▂ sparks │ │  2 due today│ │  3 invoices│ │  waiting  │ │
│ ◻ Content  │  └──────────────┘ └─────────────┘ └────────────┘ └───────────┘ │
│ ◻ Finance  │                                                                 │
│ ◻ Team     │  Needs you                                   [filter ▾] [views]│
│ ◻ Talent   │  ● Revision Needed · Aura Skincare reel        due 2pm   ⟶      │
│ ──────     │  ● On Site · Northside Café shoot              now       ⟶      │
│ ⚙ Settings │  ● Overdue · Invoice #1043 Monk & Co           +6 days   ⟶      │
│ ◐ Priya    │  ● Approval · Edit "Launch teaser" → client    waiting   ⟶      │
│            │  ────────────────────────────────────────────────────────────  │
│            │  This week    [ Mon  Tue  Wed  Thu  Fri ]        ✦ What AI noticed│
│            │   Shoots 2 · Edits 7 · Posts 14 · Meetings 3     "2 edits at risk…"│
└────────────┴───────────────────────────────────────────────────────────────┘
```

### 11.2 Client record (right-side Sheet over the Clients list)

```
            Clients list (dimmed)        ┌─ Sheet · elev-3 ───────────────────┐
┌──────────────────────────────────────┐│ ◀  Aura Skincare            ⤢  ✕   │
│ Clients            [+ Client] [⌘K]    ││ ● Retainer: Growth  · AM: Priya K. │
│ ───────────────────────────────────  ││ [Overview][Shoots][Edits][Finance] │
│ Name          AM      Status   MRR    ││ ────────────────────────────────── │
│ Aura Skincare Priya   ● Active £2,400 ││ Main contact  Leah Osei            │
│ Monk & Co     Dan     ● Overdue £1,900││   leah@aura.co · +44 7…   💬  ✉   │
│ Northside Café Priya  ● Active £1,200 ││ Brand kit     ▣ coral ▣ ink  Guide │
│ …                                     ││ Next shoot    Fri 14 Nov · On site │
│                                       ││ Open edits    2  ● Revision Needed │
│                                       ││ ────────────────────────────────── │
│                                       ││ Checklist · November               │
│                                       ││  ☑ Agree design list               │
│                                       ││  ☐ Build monthly report            │
│                                       ││  ☐ Confirm posts went out          │
│                                       ││ ────────────────────────────────── │
│                                       ││ Finance (can_see_money)            │
│                                       ││  Outstanding £1,900 · Paid YTD £19k │
│  [rows continue beneath the sheet]    ││ [ Draft chase ✦ ] [ New shoot ]    │
└──────────────────────────────────────┘└────────────────────────────────────┘
```
*(The Finance block renders only when the viewer holds `can_see_money`; otherwise it is absent, not greyed.)*

---

## 12. Tailwind / shadcn integration notes (planned)

- `tailwind.config.ts` for the OS extends a **`bs` colour namespace** bound to the `--bs-*` variables (`bg-bs-surface`, `text-bs-muted`, `border-bs-border`, …), plus the type/space/radius/elevation tokens above. The marketing site's config is **not** shared verbatim — the OS keeps its own tokens to stay dense and dual-theme while remaining on-brand.
- shadcn's generated CSS variables (`--background`, `--foreground`, `--primary`, `--ring`, `--radius`, etc.) are **aliased** onto `--bs-*` in one place so every shadcn component inherits the system; we avoid editing shadcn components except to apply density classes.
- Shared DS lives in a design-system directory/package (Foundation §2, §6) — `components/ds/*` wrapping shadcn primitives, with the token CSS in a single `os-theme.css`.
- Dark mode via `data-theme` on `<html>`; `body` sets explicit `--bs-canvas` background; system default respected.
- Density preference (compact/comfortable) and theme are user settings persisted server-side with the user's profile; the per-session UI conveniences (collapsed sidebar, last view) may use local storage.

---

## 13. Open questions — Lead Architect decisions

1. **Monospace family** — add Geist Mono for IDs/amounts/keys, or use system `ui-monospace`? (§4.1)
2. **Contrast target** — AA everywhere, or AAA (7:1) for auth and finance figures? (§3.4)
3. **Icon policy** — Lucide only (line), or permit a second filled/duotone set for emphasis + brand marks? (§10)
4. **Cream usage** — confirm cream is a restricted brand accent (auth, AI header, empty states) and not an app canvas option, to protect status-colour legibility. (§3.2)
5. **Density default** — ship "compact" (14px base, 8px rows) as default, with "comfortable" opt-in? Affects first-run feel. (§4.2, §5.1)
6. **Chart library** — Recharts vs visx (bundle vs flexibility), given PWA weight budget. (§6.14)
7. **AI panel real estate** — persistent resizable side-panel vs on-demand overlay as the default on tablet. (§7)

These do not block component work starting against the tokens as specified; they refine edges.

---

*End of DESIGN_SYSTEM.md (v0, planned). Consistent with `_FOUNDATION.md`; schema/stack owned elsewhere. British English.*
