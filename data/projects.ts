import type { Project, ProjectCategory } from "./types";

/**
 * Portfolio — real Blanc Script work (YouTube-hosted).
 * Card covers use each video's YouTube thumbnail automatically; case-study
 * pages embed the player. To add a project, copy an entry and set a unique
 * `slug`, a `category`, and the `youTubeId` (from the video URL).
 */

// Canonical category order for the portfolio filters.
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

const yt = (youTubeId: string, alt: string, kind: "video" | "reel") =>
  ({ kind, youTubeId, alt });

export const projects: Project[] = [
  {
    slug: "awakening-25th-anniversary",
    title: "Awakening — 25th Anniversary",
    client: "Awakening",
    industry: "Entertainment",
    category: "Events",
    service: "Event Film",
    year: "2025",
    summary: "A cinematic film marking Awakening's 25th anniversary.",
    orientation: "horizontal",
    cover: yt("xJ-EGWA5hjk", "Awakening 25th Anniversary film", "video"),
    video: yt("xJ-EGWA5hjk", "Awakening 25th Anniversary film", "video"),
    featured: true,
    accent: "coral",
  },
  {
    slug: "audi-r8",
    title: "Audi R8",
    industry: "Automotive",
    category: "Automotive",
    service: "Automotive Cinematic",
    year: "2025",
    summary: "A cinematic automotive film built around the Audi R8.",
    orientation: "horizontal",
    cover: { kind: "video", bunnyId: "4c9d8556-4403-49b3-bcdc-037d35cbeb8c", alt: "Audi R8 cinematic film" },
    video: { kind: "video", bunnyId: "4c9d8556-4403-49b3-bcdc-037d35cbeb8c", alt: "Audi R8 cinematic film" },
    featured: true,
    accent: "charcoal",
  },
  {
    slug: "chicken-jalfrezi",
    title: "Chicken Jalfrezi",
    industry: "Restaurants",
    category: "Food",
    service: "Short-Form Content",
    year: "2025",
    summary: "Short-form food content that makes the dish the hero.",
    orientation: "vertical",
    cover: yt("iMPBRZNL8CM", "Chicken Jalfrezi food reel", "reel"),
    video: yt("iMPBRZNL8CM", "Chicken Jalfrezi food reel", "reel"),
    featured: true,
    accent: "gold",
  },
  {
    slug: "cheesy-naan",
    title: "Cheesy Naan",
    industry: "Restaurants",
    category: "Food",
    service: "Short-Form Content",
    year: "2025",
    summary: "A food reel styled and shot for the feed.",
    orientation: "vertical",
    cover: yt("vG2q7RXGSlo", "Cheesy Naan food reel", "reel"),
    video: yt("vG2q7RXGSlo", "Cheesy Naan food reel", "reel"),
    accent: "gold",
  },
  {
    slug: "biryani-bite",
    title: "Biryani Bite",
    industry: "Restaurants",
    category: "Food",
    service: "Short-Form Content",
    year: "2025",
    summary: "A close-up food reel built to stop the scroll.",
    orientation: "vertical",
    cover: yt("Eadxb9YTQyo", "Biryani Bite food reel", "reel"),
    video: yt("Eadxb9YTQyo", "Biryani Bite food reel", "reel"),
    accent: "gold",
  },
  {
    slug: "biryani-and-sauce",
    title: "Biryani & Sauce",
    industry: "Restaurants",
    category: "Food",
    service: "Short-Form Content",
    year: "2025",
    summary: "Short-form food content with cinematic detail.",
    orientation: "vertical",
    cover: yt("AffcFt__IQY", "Biryani and sauce food reel", "reel"),
    video: yt("AffcFt__IQY", "Biryani and sauce food reel", "reel"),
    accent: "gold",
  },
  {
    slug: "aloo-keema",
    title: "Aloo Keema",
    industry: "Restaurants",
    category: "Food",
    service: "Short-Form Content",
    year: "2025",
    summary: "A food reel shot to make it irresistible.",
    orientation: "vertical",
    cover: yt("i8n5HvG6_EE", "Aloo Keema food reel", "reel"),
    video: yt("i8n5HvG6_EE", "Aloo Keema food reel", "reel"),
    accent: "gold",
  },
  {
    slug: "argeela-vibe",
    title: "Argeela — Vibe",
    client: "Argeela",
    industry: "Hospitality",
    category: "Hospitality",
    service: "Short-Form Content",
    year: "2025",
    summary: "Capturing the atmosphere of the Argeela lounge.",
    orientation: "vertical",
    cover: yt("dApzcSUC6pk", "Argeela lounge atmosphere reel", "reel"),
    video: yt("dApzcSUC6pk", "Argeela lounge atmosphere reel", "reel"),
    accent: "teal",
  },
  {
    slug: "argeela-food",
    title: "Argeela — Food",
    client: "Argeela",
    industry: "Hospitality",
    category: "Hospitality",
    service: "Short-Form Content",
    year: "2025",
    summary: "Food content for the Argeela venue.",
    orientation: "vertical",
    cover: yt("BTwEr5hXSLI", "Argeela food reel", "reel"),
    video: yt("BTwEr5hXSLI", "Argeela food reel", "reel"),
    accent: "teal",
  },
  {
    slug: "argeela-decor",
    title: "Argeela — Decor",
    client: "Argeela",
    industry: "Hospitality",
    category: "Hospitality",
    service: "Short-Form Content",
    year: "2025",
    summary: "Showcasing the Argeela space and detail.",
    orientation: "vertical",
    cover: yt("kS6xERrYB1k", "Argeela decor reel", "reel"),
    video: yt("kS6xERrYB1k", "Argeela decor reel", "reel"),
    accent: "teal",
  },
  {
    slug: "bnc-conference",
    title: "BNC Conference",
    industry: "Events",
    category: "Events",
    service: "Event Content",
    year: "2025",
    summary: "Event content captured at the BNC conference.",
    orientation: "vertical",
    cover: yt("F2gThw0bbcE", "BNC Conference reel", "reel"),
    video: yt("F2gThw0bbcE", "BNC Conference reel", "reel"),
    accent: "coral",
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
