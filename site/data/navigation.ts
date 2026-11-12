import type { NavLink } from "./types";

export const mainNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Studio",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Social Media", href: "/services#social-media" },
      { label: "Video Production", href: "/services#video-production" },
      { label: "Short-Form Content", href: "/services#short-form" },
      { label: "Photography", href: "/services#photography" },
      { label: "Creative Campaigns", href: "/services#campaigns" },
      { label: "Branding & Direction", href: "/services#branding" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
];

/** Primary calls-to-action reused across the site. */
export const cta = {
  primary: { label: "Start a Project", href: "/contact" },
  secondary: { label: "Book a Discovery Call", href: "/contact#discovery" },
  portfolio: { label: "View Portfolio", href: "/portfolio" },
} as const;
