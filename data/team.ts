import type { TeamMember } from "./types";

/**
 * The Blanc Script team.
 * TO ADD PORTRAITS: set media.src to an image in /public (e.g. "/media/ibrahim.jpg")
 * and update media.alt. Until then, an on-brand placeholder is shown.
 */
export const team: TeamMember[] = [
  {
    name: "Ibrahim Ali",
    role: "Co-Founder & Brand Strategy Director",
    bio: "Shapes brand positioning, marketing strategy and commercial growth, ensuring every creative decision serves a clear business objective.",
    media: { kind: "photo", alt: "Ibrahim Ali — Co-Founder & Brand Strategy Director" },
  },
  {
    name: "Noman Ahmed",
    role: "Co-Founder & Creative Director",
    bio: "Transforms strategy into compelling visual storytelling through cinematic production, creative direction and meticulous execution.",
    media: { kind: "photo", alt: "Noman Ahmed — Co-Founder & Creative Director" },
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
