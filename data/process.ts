import type { ProcessStep } from "./types";

/** The five-stage Blanc Script method. */
export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Discover",
    description:
      "We get under the skin of the brand — objectives, audience, market position and what's actually working now.",
  },
  {
    number: "02",
    title: "Strategise",
    description:
      "We set the content direction, the campaign plan and the creative approach before a single frame is shot.",
  },
  {
    number: "03",
    title: "Create",
    description:
      "We script, plan, film, photograph and produce — cinematic quality, built for the platforms it lives on.",
  },
  {
    number: "04",
    title: "Launch",
    description:
      "We publish, distribute and manage the rollout across every relevant channel, organic and paid.",
  },
  {
    number: "05",
    title: "Optimise",
    description:
      "We read the data, learn what landed, and sharpen the next round of content against real performance.",
  },
];

/** Differentiators for the "Why Blanc Script" section. */
export const differentiators: { title: string; description: string }[] = [
  {
    title: "Strategy before content",
    description: "Every brief starts with a plan, not a camera.",
  },
  {
    title: "Premium cinematic quality",
    description: "Production values built for brands people take seriously.",
  },
  {
    title: "Built for social platforms",
    description: "Content shaped for how audiences actually watch and scroll.",
  },
  {
    title: "Creative and commercial",
    description: "Ideas that look the part and move the numbers.",
  },
  {
    title: "End-to-end delivery",
    description: "Strategy, production and management under one roof.",
  },
  {
    title: "Industry-specific experience",
    description: "Sharper work because we understand the sector.",
  },
  {
    title: "Consistent brand storytelling",
    description: "A through-line that compounds across every piece.",
  },
  {
    title: "Performance-focused",
    description: "Decisions made against data, not guesswork.",
  },
];
