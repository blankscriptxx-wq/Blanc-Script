import {
  Share2,
  Clapperboard,
  Smartphone,
  Camera,
  Megaphone,
  Compass,
} from "lucide-react";
import type { Service } from "./types";

/**
 * The six core services. Copy is production-ready; media is placeholder.
 * Slugs are used as anchor targets from the nav and homepage cards.
 */
export const services: Service[] = [
  {
    slug: "social-media",
    title: "Social Media Strategy & Management",
    short: "Social Media",
    tagline: "Presence with a point of view.",
    description:
      "We run social like a channel, not an afterthought — platform strategy, a content calendar with intent, and the day-to-day management that keeps a brand consistent and growing.",
    suitableFor:
      "Brands that post but don't yet see momentum, and teams that want social handled properly rather than squeezed between other jobs.",
    value:
      "A clear content system, a recognisable feed, and reporting that ties activity to reach, engagement and enquiries — not vanity metrics.",
    deliverables: [
      "Platform strategy",
      "Content planning",
      "Monthly content calendars",
      "Caption writing",
      "Scheduling & publishing",
      "Community engagement",
      "Reporting & optimisation",
    ],
    examples: [
      "Instagram & TikTok management",
      "YouTube Shorts programming",
      "Facebook & LinkedIn (where relevant)",
      "Monthly performance reviews",
    ],
    icon: Share2,
    accent: "coral",
    media: { kind: "reel" },
  },
  {
    slug: "video-production",
    title: "Cinematic Video Production",
    short: "Video",
    tagline: "Film that carries a brand.",
    description:
      "Brand films, commercials and product pieces shot and edited to a cinematic standard — built around a story, not just a shot list.",
    suitableFor:
      "Established brands and ambitious businesses that need hero content with real production value for launches, websites and paid media.",
    value:
      "A signature piece of content that raises perceived quality across every channel it touches and works for years, not weeks.",
    deliverables: [
      "Brand films",
      "Commercial videos",
      "Product films",
      "Automotive cinematics",
      "Restaurant & hospitality films",
      "Event films",
      "Interviews",
      "Promotional content",
    ],
    examples: [
      "60–90s brand film",
      "Paid social campaign cutdowns",
      "Automotive walkaround cinematics",
      "Founder & interview features",
    ],
    icon: Clapperboard,
    accent: "gold",
    media: { kind: "video" },
  },
  {
    slug: "short-form",
    title: "Short-Form Content",
    short: "Short-Form",
    tagline: "Made for the feed, built to travel.",
    description:
      "Reels, TikToks and Shorts designed around how people actually watch — fast, native and trend-aware, with the polish of a studio behind them.",
    suitableFor:
      "Brands and founders who need a steady stream of short-form that performs organically without looking like an ad.",
    value:
      "Consistent, platform-native output that keeps a brand in feeds between the big campaigns — and gives the algorithm something to reward.",
    deliverables: [
      "TikTok videos",
      "Instagram Reels",
      "YouTube Shorts",
      "Trend-led content",
      "Phone-shot organic content",
      "Scripted videos",
      "Behind-the-scenes content",
      "Founder-led content",
    ],
    examples: [
      "Monthly short-form batches",
      "Trend-response turnarounds",
      "Founder talking-head series",
      "BTS from shoots & events",
    ],
    icon: Smartphone,
    accent: "teal",
    media: { kind: "reel" },
  },
  {
    slug: "photography",
    title: "Photography",
    short: "Photography",
    tagline: "Stills that sell.",
    description:
      "Product, food, automotive and lifestyle photography styled and lit for the way brands actually use images — web, social, print and paid.",
    suitableFor:
      "Retail, hospitality, restaurants and product brands that need a library of images working across every touchpoint.",
    value:
      "A cohesive image bank that lifts the look of a website, feed and campaigns — and removes the scramble for assets every month.",
    deliverables: [
      "Product photography",
      "Automotive photography",
      "Food photography",
      "Lifestyle photography",
      "Campaign photography",
      "Event photography",
      "Social media assets",
    ],
    examples: [
      "Product & e-commerce sets",
      "Menu & food photography",
      "Vehicle features",
      "Campaign lifestyle imagery",
    ],
    icon: Camera,
    accent: "gold",
    media: { kind: "photo" },
  },
  {
    slug: "campaigns",
    title: "Creative Campaigns",
    short: "Campaigns",
    tagline: "An idea, taken all the way.",
    description:
      "Campaign concepts with a spine — creative direction, storyboards and rollout across organic and paid, built to launch and to last a season.",
    suitableFor:
      "Brands with a moment to make count: a launch, an opening, a season, or a push that needs to feel bigger than a single post.",
    value:
      "One coherent idea expressed everywhere it needs to be, so spend works harder and the campaign is remembered.",
    deliverables: [
      "Campaign concepts",
      "Creative direction",
      "Storyboarding",
      "Launch campaigns",
      "Influencer collaborations",
      "Promotional strategy",
      "Paid social creative",
      "Seasonal campaigns",
    ],
    examples: [
      "Product / venue launch campaigns",
      "Seasonal creative rollouts",
      "Influencer collaboration packages",
      "Paid social creative sets",
    ],
    icon: Megaphone,
    accent: "coral",
    media: { kind: "video" },
  },
  {
    slug: "branding",
    title: "Branding & Visual Direction",
    short: "Branding",
    tagline: "A look worth recognising.",
    description:
      "Positioning, visual direction and content guidelines that make a brand instantly recognisable — and keep it consistent as it scales.",
    suitableFor:
      "New brands finding their look, and established brands whose presence has drifted and needs pulling back into focus.",
    value:
      "A defined visual language and tone that every piece of content can be measured against — so the brand compounds instead of resetting.",
    deliverables: [
      "Brand positioning",
      "Visual identity direction",
      "Social media appearance",
      "Campaign styling",
      "Content guidelines",
      "Tone of voice",
      "Brand storytelling",
    ],
    examples: [
      "Visual direction & moodboards",
      "Social content guidelines",
      "Tone-of-voice framework",
      "Brand story & messaging",
    ],
    icon: Compass,
    accent: "teal",
    media: { kind: "image" },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/** Engagement models shown on the Services page (no fixed prices). */
export const engagementModels: {
  name: string;
  best: string;
  includes: string;
  accent: "coral" | "teal" | "gold";
}[] = [
  {
    name: "One-off Project",
    best: "A single film, shoot or campaign with a defined scope.",
    includes: "Discovery, production and delivery for one clear deliverable.",
    accent: "gold",
  },
  {
    name: "Monthly Content Package",
    best: "Brands that need a reliable stream of content each month.",
    includes: "A set volume of short-form, photography and edits on a schedule.",
    accent: "teal",
  },
  {
    name: "Social Media Management",
    best: "Teams that want social planned, produced and posted for them.",
    includes: "Strategy, calendar, publishing, community and reporting.",
    accent: "coral",
  },
  {
    name: "Full Campaign",
    best: "A launch or season that needs one idea across every channel.",
    includes: "Concept, creative direction, production and paid social creative.",
    accent: "gold",
  },
  {
    name: "Creative Partnership",
    best: "Brands that want a studio on call as an extension of their team.",
    includes: "Ongoing strategy, production and optimisation across services.",
    accent: "teal",
  },
];
