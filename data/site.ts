/**
 * Global site configuration: brand, contact details, social links, base location.
 * ── PLACEHOLDERS ── replace phone/email/address before launch (see README).
 */

export const site = {
  name: "Blanc Script",
  legalName: "Blanc Script Ltd",
  tagline: "A strategy-led creative agency.",
  /** The core brand idea. */
  brandIdea: "Every great brand starts with a Blanc Script. Let's build yours.",
  description:
    "Blanc Script is a strategy-led creative agency in Birmingham building cinematic content, social media and brand campaigns that earn attention and drive growth.",
  url: "https://blancscript.com",
  locale: "en_GB",

  // ── Contact ────────────────────────────────────────────
  contact: {
    email: "hello@blancscript.com", // ── PLACEHOLDER (confirm your inbox)
    phone: "+44 7939 138551",
    phoneHref: "tel:+447939138551",
    // Discovery call link — swap for your Calendly / SavvyCal / cal.com URL
    bookingUrl: "https://calendly.com/hello-blancscript/30min?back=1&month=2026-07", // ── PLACEHOLDER (e.g. https://calendly.com/blancscript)
  },

  location: {
    city: "Birmingham",
    region: "West Midlands",
    country: "United Kingdom",
    countryCode: "GB",
    // Availability messaging
    coverage: "Based in Birmingham. Working nationwide and internationally.",
    // Approximate coordinates for LocalBusiness schema — refine if needed
    geo: { lat: 52.4862, lng: -1.8904 },
  },

  // ── Social — instagram is real; others are PLACEHOLDERS ──
  social: {
    instagram: "https://www.instagram.com/blanc.script",
    tiktok: "https://www.tiktok.com/@blancscript", // ── PLACEHOLDER
    linkedin: "https://www.linkedin.com/company/blanc-script", // ── PLACEHOLDER
    youtube: "https://www.youtube.com/@blanc.script", // ── PLACEHOLDER
  },
} as const;

export type SocialKey = keyof typeof site.social;
