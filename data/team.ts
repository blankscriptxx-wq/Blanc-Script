import type { TeamMember } from "./types";

/**
 * ── PLACEHOLDER TEAM ──────────────────────────────────────────────────
 * Replace names, roles, bios and portraits with the real team. Add or
 * remove members freely.
 * ──────────────────────────────────────────────────────────────────────
 */
export const team: TeamMember[] = [
  {
    name: "Placeholder Name",
    role: "Founder & Creative Director",
    bio: "Leads strategy and creative direction across every project.",
    media: { kind: "photo", alt: "Placeholder — team portrait" },
  },
  {
    name: "Placeholder Name",
    role: "Head of Production",
    bio: "Runs shoots end to end, from planning to final edit.",
    media: { kind: "photo", alt: "Placeholder — team portrait" },
  },
  {
    name: "Placeholder Name",
    role: "Social & Strategy Lead",
    bio: "Owns platform strategy, calendars and performance.",
    media: { kind: "photo", alt: "Placeholder — team portrait" },
  },
  {
    name: "Placeholder Name",
    role: "Photographer & Editor",
    bio: "Shapes the look across stills and short-form.",
    media: { kind: "photo", alt: "Placeholder — team portrait" },
  },
];

/** Values shown on the About page. */
export const values: { title: string; description: string }[] = [
  {
    title: "Strategy first",
    description: "We earn the right to be creative by understanding the business.",
  },
  {
    title: "Craft is non-negotiable",
    description: "Cinematic standards, whether it's a brand film or a phone-shot reel.",
  },
  {
    title: "Social-native thinking",
    description: "We make content for how people actually watch, not for the boardroom.",
  },
  {
    title: "Commercial honesty",
    description: "We measure work by what it does for the brand, not how it feels to make.",
  },
  {
    title: "Close collaboration",
    description: "We work as an extension of your team, not a black box.",
  },
  {
    title: "High standards, held",
    description: "Consistency is the point. We hold the line on every deliverable.",
  },
];
