# Blanc Script OS — Design Direction v2 (futuristic, three themes, motion)

Owner brief (12 Nov 2026): state-of-the-art, futuristic look and feel; rich hover/click
micro-interactions and status indicators; **Light**, **Dark** and **Liquid Glass** modes.
Extends `DESIGN_SYSTEM.md` (tokens, components, a11y) — that remains the base contract.

References are in `docs/design-refs/` — used for **patterns**, not copied. Brand stays
Blanc Script (coral primary, teal secondary), not the references' violet/green.

## What we take from each reference
| Ref | Pattern we adopt | Where it lands in the OS |
|---|---|---|
| 01 BAD analytics | KPI strip: value + delta + sparkline + "vs previous period"; forecast chart with actual vs projected (dashed) vs goal; inline **AI Insight** card; data-status widget | Command Centre, Finance, Reports |
| 02 Auralis | Proof that **light mode** can feel premium: airy, big radii, one accent; **AI assistant panel with quick-action tiles** | Light theme quality bar; AI panel |
| 03 ProjectFlow | Dark **kanban** with thumbnails, progress bars, status chips ("Waiting for feedback", "Ready for approval"); right rail with board stats, team activity, quick-filter toggles | Edits board, Projects, Tasks |
| 04 Frame.io | 3-pane review: asset tree · thumbnail grid · player with **timeline comment markers** + timestamped threaded comments | Post-production review (we chose Frame.io) |
| 05 Harmony Hub | Glowing active nav, Paid/Pending/Overdue pills, ambient gradient background | Finance/invoices; nav active state |
| 06 Social Agent | Content **calendar + scheduled list** side by side; visual **automation pipeline** (trigger → AI draft → schedule → publish → monitor) | Content & Social Studio; Automations |
| 07 GradientHarbor | Filter bar + KPI blocks + **conversational AI side panel** that builds/explains views | Reports; Blanc Script AI |

Common thread: dark-first, one vivid accent, dense-but-calm data, a context rail on the
right, AI as a first-class panel (not a chat bubble), status always visible at a glance.

## Three themes
All three share one token contract (`--bs-*`); a theme only swaps values. Switch via
`data-theme="light|dark|glass"`; default follows system (light/dark).

1. **Light** — warm near-white canvas, white cards, crisp hairlines (Auralis-grade airiness).
2. **Dark** — deeper, near-black warm charcoal for a more futuristic feel; surfaces step up in
   lightness for depth; accent glows allowed.
3. **Liquid Glass** — translucent layered surfaces over a slow-moving ambient brand
   gradient (coral/teal light fields):
   - Surfaces: `rgba` fills + `backdrop-filter: blur(20–28px) saturate(160–180%)`.
   - **Specular edge**: 1px inner highlight top/left, faint darker edge bottom/right.
   - Depth through blur strength (overlays blur more than cards), not heavy shadows.
   - Light-glass and dark-glass variants (follows system brightness).
   - **Guardrails:** dense tables/forms sit on near-opaque glass so text stays readable
     (WCAG AA); honour `prefers-reduced-transparency` (fall back to solid Dark/Light);
     cap the number of stacked blurred layers (performance); ambient background animation
     pauses under reduced-motion and when the tab is hidden.

## Motion & micro-interactions (the "feel")
Rule: transform/opacity only, 120–260ms, spring for physical things, everything respects
`prefers-reduced-motion`. Library: Framer Motion.

- **Hover (cards/rows):** lift 1–2px + soft shadow; **pointer-following spotlight** (radial
  accent glow tracking the cursor) on cards and the command palette; border brightens.
- **Press:** scale 0.98 spring-back; buttons show a brief accent ripple/glow.
- **Focus:** coral ring, always visible on keyboard.
- **Status indicators:** live **pulsing dot** for "On site", "Syncing", "Live"; animated
  progress bars; status pills cross-fade colour on change; count-up numbers when KPIs load
  or update in realtime (Neon Realtime); sparklines draw in.
- **Lists/boards:** layout animations on reorder (kanban drag, optimistic moves with
  rollback shake on failure); staggered fade-in of rows on first load.
- **Overlays:** sheets slide with spring; command palette scales from 0.97 with blur-in;
  toasts slide and stack.
- **Loading:** shimmer skeletons matching final layout; no full-page spinners.
- **AI:** "thinking" shimmer on the AI panel; streamed text; tool actions show as step chips
  (like Social Agent's pipeline) before confirm.
- **Navigation:** active nav item has a glowing indicator that glides between items (shared
  layout animation).

## Build order
1. Theme engine: three themes + switcher (topbar + settings), persisted per user.
2. Motion primitives: `<Spotlight>`, `<Lift>`, `<PulseDot>`, `<CountUp>`, `<Sparkline>`,
   animated `<StatusPill>`, gliding nav indicator, shimmer skeleton.
3. Restyle existing shell + Today + auth with the above; KPI tiles get sparkline + delta.
4. New screens adopt them by default (Clients, Projects/Edits kanban, Review, Calendar).

Out of scope: copying any reference's layout, branding or assets verbatim.
