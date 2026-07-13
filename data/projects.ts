import type { Project, ProjectCategory } from "./types";

/**
 * ── PLACEHOLDER PORTFOLIO ──────────────────────────────────────────────
 * Every project below is illustrative. Client names, results and media are
 * placeholders. Replace `client`, `results`, and each `MediaRef` (add `src`
 * for images or `videoSrc` + `poster` for video) with real assets.
 * Structure is production-ready — add or remove projects freely.
 * ───────────────────────────────────────────────────────────────────────
 */

export const projectCategories: ("All" | ProjectCategory)[] = [
  "All",
  "Automotive",
  "Hospitality",
  "Food",
  "Events",
  "Luxury",
  "Social Media",
  "Campaigns",
];

export const projects: Project[] = [
  {
    slug: "midnight-drive",
    title: "Midnight Drive",
    client: "Placeholder Automotive Co.",
    industry: "Automotive",
    category: "Automotive",
    service: "Cinematic Video Production",
    year: "2025",
    summary: "A launch film that made a performance saloon feel like a character.",
    orientation: "horizontal",
    cover: { kind: "video", alt: "Placeholder — automotive launch film cover" },
    featured: true,
    accent: "charcoal",
    challenge:
      "A new model arriving in a crowded segment with strong incumbents and a launch window measured in weeks.",
    strategy:
      "Lead with feeling, not spec. Position the car as an experience and build a content ladder from a hero film down to short-form cutdowns for paid and organic.",
    approach:
      "Night shoot across the city, anamorphic look, sound design built around the drivetrain. One hero film, six vertical cutdowns, a stills set for retail.",
    deliverables: [
      "90-second brand film",
      "6× vertical social cutdowns",
      "Automotive stills library",
      "Paid social creative set",
    ],
    results: [
      { label: "Video views", value: "PLACEHOLDER" },
      { label: "Engagement rate", value: "PLACEHOLDER" },
      { label: "Enquiries", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — automotive still 1" },
      { kind: "image", alt: "Placeholder — automotive still 2" },
      { kind: "image", alt: "Placeholder — automotive still 3" },
    ],
    video: { kind: "video", alt: "Placeholder — Midnight Drive film" },
    testimonial: {
      quote:
        "The film reframed how people saw the car overnight. It felt like a brand, not an ad.",
      attribution: "Placeholder — Marketing Director, Automotive brand",
    },
  },
  {
    slug: "table-for-two",
    title: "Table for Two",
    client: "Placeholder Restaurant Group",
    industry: "Restaurants",
    category: "Food",
    service: "Photography & Short-Form",
    year: "2025",
    summary: "A menu relaunch shot to make every dish worth the tap.",
    orientation: "vertical",
    cover: { kind: "photo", alt: "Placeholder — food photography cover" },
    featured: true,
    accent: "gold",
    challenge:
      "A refreshed menu with beautiful food that photographed inconsistently and underperformed on social.",
    strategy:
      "Build a repeatable visual system for food — lighting, styling and framing — that any dish could pass through and look premium.",
    approach:
      "A one-day studio and in-service shoot producing a stills library plus short-form reels for launch week.",
    deliverables: [
      "40+ dish photographs",
      "8× Instagram Reels",
      "Menu & web imagery",
      "Content styling guide",
    ],
    results: [
      { label: "Reach", value: "PLACEHOLDER" },
      { label: "Saves & shares", value: "PLACEHOLDER" },
      { label: "Bookings", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — food still 1" },
      { kind: "image", alt: "Placeholder — food still 2" },
      { kind: "image", alt: "Placeholder — food still 3" },
    ],
    testimonial: {
      quote:
        "Our feed finally looks like the room feels. The difference in engagement was immediate.",
      attribution: "Placeholder — Owner, Restaurant group",
    },
  },
  {
    slug: "opening-night",
    title: "Opening Night",
    client: "Placeholder Hospitality Group",
    industry: "Hospitality",
    category: "Hospitality",
    service: "Creative Campaign",
    year: "2024",
    summary: "A venue launch that sold out its first month before the doors opened.",
    orientation: "horizontal",
    cover: { kind: "video", alt: "Placeholder — hospitality launch cover" },
    featured: true,
    accent: "teal",
    challenge:
      "A new venue with no audience, a fixed opening date and a city full of alternatives.",
    strategy:
      "Build anticipation as the product. A teaser-led campaign across organic and paid, escalating to a launch-week takeover.",
    approach:
      "Teaser film, countdown short-form, influencer previews and a launch-night event film — all under one visual identity.",
    deliverables: [
      "Teaser & launch films",
      "Countdown short-form series",
      "Influencer preview package",
      "Event coverage",
    ],
    results: [
      { label: "Pre-launch reach", value: "PLACEHOLDER" },
      { label: "Waitlist signups", value: "PLACEHOLDER" },
      { label: "Opening-month covers", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — venue still 1" },
      { kind: "image", alt: "Placeholder — venue still 2" },
    ],
    video: { kind: "video", alt: "Placeholder — Opening Night film" },
  },
  {
    slug: "house-of-atelier",
    title: "House of Atelier",
    client: "Placeholder Luxury Maison",
    industry: "Luxury",
    category: "Luxury",
    service: "Branding & Visual Direction",
    year: "2024",
    summary: "A visual language for a luxury label entering social with intent.",
    orientation: "square",
    cover: { kind: "image", alt: "Placeholder — luxury brand cover" },
    accent: "charcoal",
    challenge:
      "A heritage-minded label that needed a social presence without cheapening the brand.",
    strategy:
      "Define a restrained visual system — palette, pace and tone — that translated luxury cues to a scrolling feed.",
    approach:
      "Art-directed content system, campaign photography and a set of guidelines the in-house team could run with.",
    deliverables: [
      "Visual identity direction",
      "Campaign photography",
      "Content guidelines",
      "Tone-of-voice framework",
    ],
    results: [
      { label: "Follower growth", value: "PLACEHOLDER" },
      { label: "Engagement rate", value: "PLACEHOLDER" },
      { label: "Save rate", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — luxury still 1" },
      { kind: "image", alt: "Placeholder — luxury still 2" },
      { kind: "image", alt: "Placeholder — luxury still 3" },
    ],
  },
  {
    slug: "festival-cut",
    title: "Festival Cut",
    client: "Placeholder Events Co.",
    industry: "Events",
    category: "Events",
    service: "Event Film & Social",
    year: "2024",
    summary: "Same-day event content that kept the energy live across the weekend.",
    orientation: "vertical",
    cover: { kind: "reel", alt: "Placeholder — event film cover" },
    accent: "coral",
    challenge:
      "A multi-day event needing content fast enough to fuel social while it was still happening.",
    strategy:
      "On-site edit team producing same-day cutdowns to keep momentum and pull next-day audiences.",
    approach:
      "Roaming capture, same-day vertical edits, a highlight film and a stills set for partners and press.",
    deliverables: [
      "Same-day social cutdowns",
      "Weekend highlight film",
      "Press & partner stills",
      "Sponsor content package",
    ],
    results: [
      { label: "Weekend views", value: "PLACEHOLDER" },
      { label: "Story reach", value: "PLACEHOLDER" },
      { label: "Next-year signups", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — event still 1" },
      { kind: "image", alt: "Placeholder — event still 2" },
    ],
    video: { kind: "video", alt: "Placeholder — Festival Cut highlight film" },
  },
  {
    slug: "founder-series",
    title: "Founder Series",
    client: "Placeholder Personal Brand",
    industry: "Professional Services",
    category: "Social Media",
    service: "Short-Form & Management",
    year: "2025",
    summary: "A founder-led short-form engine built to grow an audience monthly.",
    orientation: "vertical",
    cover: { kind: "reel", alt: "Placeholder — founder content cover" },
    accent: "teal",
    challenge:
      "A founder with expertise and no time, and a personal brand that stalled whenever posting stopped.",
    strategy:
      "Turn one recording session a month into weeks of platform-native short-form, managed end-to-end.",
    approach:
      "Monthly batch filming, scripted and trend-led edits, plus scheduling, captions and community management.",
    deliverables: [
      "Monthly batch filming",
      "12+ short-form videos / month",
      "Scheduling & captions",
      "Community management",
    ],
    results: [
      { label: "Follower growth", value: "PLACEHOLDER" },
      { label: "Avg. views / video", value: "PLACEHOLDER" },
      { label: "Inbound enquiries", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — founder still 1" },
      { kind: "image", alt: "Placeholder — founder still 2" },
    ],
  },
  {
    slug: "season-of-us",
    title: "Season of Us",
    client: "Placeholder Retail Brand",
    industry: "Retail",
    category: "Campaigns",
    service: "Seasonal Campaign",
    year: "2024",
    summary: "A seasonal campaign that ran as one idea across every channel.",
    orientation: "horizontal",
    cover: { kind: "image", alt: "Placeholder — retail campaign cover" },
    accent: "gold",
    challenge:
      "A key trading season with a modest budget that needed to feel bigger than the spend.",
    strategy:
      "One strong idea, expressed consistently from hero film to paid creative to in-store, so every impression compounded.",
    approach:
      "Campaign concept and creative direction, a hero film, photography and a full set of paid social creative.",
    deliverables: [
      "Campaign concept & direction",
      "Hero film",
      "Campaign photography",
      "Paid social creative set",
    ],
    results: [
      { label: "Campaign reach", value: "PLACEHOLDER" },
      { label: "ROAS", value: "PLACEHOLDER" },
      { label: "Season-over-season sales", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — retail still 1" },
      { kind: "image", alt: "Placeholder — retail still 2" },
      { kind: "image", alt: "Placeholder — retail still 3" },
    ],
    video: { kind: "video", alt: "Placeholder — Season of Us hero film" },
  },
  {
    slug: "city-escape",
    title: "City Escape",
    client: "Placeholder Travel Brand",
    industry: "Travel & Tourism",
    category: "Social Media",
    service: "Content & Social",
    year: "2025",
    summary: "A destination content series built to make people book.",
    orientation: "vertical",
    cover: { kind: "reel", alt: "Placeholder — travel content cover" },
    accent: "teal",
    challenge:
      "A destination brand with stunning locations and flat, generic-feeling social content.",
    strategy:
      "A recognisable content series with a consistent look and a strong hook, engineered for saves and shares.",
    approach:
      "Location shoot producing a short-form series, a hero cinematic and a stills library for owned channels.",
    deliverables: [
      "Short-form travel series",
      "Hero cinematic",
      "Stills library",
      "Channel content plan",
    ],
    results: [
      { label: "Series views", value: "PLACEHOLDER" },
      { label: "Save rate", value: "PLACEHOLDER" },
      { label: "Referral clicks", value: "PLACEHOLDER" },
    ],
    gallery: [
      { kind: "image", alt: "Placeholder — travel still 1" },
      { kind: "image", alt: "Placeholder — travel still 2" },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  const featured = projects.filter((p) => p.featured);
  return featured.length ? featured : projects.slice(0, 3);
}

/** Next project for case-study navigation (wraps around). */
export function getNextProject(slug: string): Project {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
}
