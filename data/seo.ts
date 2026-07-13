import type { Metadata } from "next";
import { site } from "./site";

/**
 * Reusable SEO configuration. Update page metadata here in one place.
 * `buildMetadata` merges a page's fields with sensible brand defaults and
 * generates canonical URL, Open Graph and Twitter card data.
 */

export const defaultKeywords = [
  "creative agency Birmingham",
  "social media agency Birmingham",
  "video production Birmingham",
  "content creation agency Birmingham",
  "cinematic video production UK",
  "social media management Birmingham",
  "brand storytelling agency",
  "creative marketing agency UK",
];

type PageSeo = {
  title: string;
  description: string;
  /** Path only, e.g. "/services". */
  path: string;
  keywords?: string[];
  /** Override OG image per page if desired (else the generated one is used). */
  ogImage?: string;
};

export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  ogImage,
}: PageSeo): Metadata {
  const url = `${site.url}${path === "/" ? "" : path}`;
  const fullTitle =
    path === "/" ? `${site.name} — ${site.tagline}` : `${title} · ${site.name}`;

  return {
    title,
    description,
    keywords: [...new Set([...defaultKeywords, ...keywords])],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: fullTitle,
      description,
      url,
      locale: site.locale,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: site.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

/** Per-page SEO content, edited in one place. */
export const pageSeo = {
  home: {
    title: "Creative Agency in Birmingham",
    description:
      "Blanc Script is a strategy-led creative agency in Birmingham. Cinematic video, social media management and brand campaigns that earn attention and drive growth — nationwide and international.",
    path: "/",
    keywords: [
      "creative agency Birmingham",
      "social media agency Birmingham",
      "content creation agency Birmingham",
    ],
  },
  services: {
    title: "Services",
    description:
      "Social media management, cinematic video production, short-form content, photography, creative campaigns and brand direction — from a strategy-led Birmingham creative agency.",
    path: "/services",
    keywords: [
      "social media management Birmingham",
      "commercial videography Birmingham",
      "product photography Birmingham",
      "TikTok content creation agency",
      "Instagram content agency",
    ],
  },
  portfolio: {
    title: "Portfolio",
    description:
      "Selected work from Blanc Script — cinematic films, social campaigns and photography across automotive, hospitality, food, events and luxury brands.",
    path: "/portfolio",
    keywords: ["cinematic video production UK", "automotive content creation"],
  },
  about: {
    title: "About",
    description:
      "Blanc Script is a strategy-led creative studio in Birmingham. We combine creative direction, cinematic production and social strategy to build brands people remember.",
    path: "/about",
    keywords: ["brand storytelling agency", "creative marketing agency UK"],
  },
  contact: {
    title: "Contact & Start a Project",
    description:
      "Start a project with Blanc Script. Tell us about your brand and goals, or book a discovery call. Based in Birmingham, working nationwide and internationally.",
    path: "/contact",
    keywords: ["creative agency Birmingham", "hospitality content creation"],
  },
  privacy: {
    title: "Privacy Policy",
    description: "How Blanc Script collects, uses and protects your information.",
    path: "/privacy-policy",
  },
  terms: {
    title: "Terms & Conditions",
    description: "The terms governing use of the Blanc Script website and services.",
    path: "/terms",
  },
} satisfies Record<string, PageSeo>;
