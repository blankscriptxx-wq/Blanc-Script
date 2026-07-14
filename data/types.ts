import type { LucideIcon } from "lucide-react";

/**
 * Shared content types for the Blanc Script data layer.
 * Everything the site renders is typed here so placeholder content can be
 * swapped for production content in one place, safely.
 */

/** A reference to a media asset. Leave everything empty to show a placeholder. */
export type MediaRef = {
  kind?: "image" | "video" | "photo" | "reel";
  /** Image path under /public or a whitelisted remote URL. */
  src?: string;
  /** MP4 path for video/showreel. */
  videoSrc?: string;
  /** Poster image shown before a video loads. */
  poster?: string;
  /** YouTube video/Short ID — renders its thumbnail (cards) or player (case study). */
  youTubeId?: string;
  /** Bunny Stream video GUID — renders its thumbnail (cards) or player (case study). */
  bunnyId?: string;
  /** Descriptive alt text — required for real images. */
  alt?: string;
};

export type Service = {
  slug: string;
  title: string;
  /** Short label for nav chips / compact UI. */
  short: string;
  tagline: string;
  description: string;
  /** Who the service is suitable for (Services page). */
  suitableFor: string;
  /** The business value it delivers (Services page). */
  value: string;
  deliverables: string[];
  /** Example, editable outputs. */
  examples: string[];
  icon: LucideIcon;
  accent: "coral" | "teal" | "gold";
  media?: MediaRef;
};

export type Industry = {
  name: string;
  slug: string;
};

export type ProjectCategory =
  | "Automotive"
  | "Hospitality"
  | "Food"
  | "Events"
  | "Luxury"
  | "Social Media"
  | "Campaigns";

export type Project = {
  slug: string;
  title: string;
  client?: string;
  industry: string;
  category: ProjectCategory;
  service: string;
  year: string;
  /** Short one-line summary for cards. */
  summary: string;
  /** Media orientation drives card sizing (vertical = 9:16 social). */
  orientation: "vertical" | "horizontal" | "square";
  cover: MediaRef;
  featured?: boolean;
  // Case study fields — all optional; sections render only when present.
  challenge?: string;
  strategy?: string;
  approach?: string;
  deliverables?: string[];
  results?: { label: string; value: string }[];
  gallery?: MediaRef[];
  video?: MediaRef;
  testimonial?: {
    quote: string;
    attribution: string;
  };
  accent: "coral" | "teal" | "gold" | "charcoal";
};

export type Testimonial = {
  quote: string;
  name: string; // placeholder
  role: string; // placeholder
  company: string; // placeholder
  industry: string;
};

export type Stat = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  note: string;
};

export type TeamMember = {
  name: string; // placeholder
  role: string;
  bio: string;
  media?: MediaRef;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
};

export type NavLink = {
  label: string;
  href: string;
};
