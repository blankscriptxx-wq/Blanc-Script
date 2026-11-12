import type { ProposalContent } from "@/lib/db/schema";

/**
 * The starting point for a new proposal: Blanc Script's standard story, in the
 * structure of the studio's proposal page. Client-safe (no server imports).
 */
export function defaultProposal(clientName: string): ProposalContent {
  return {
    preparedFor: clientName,
    heroLines: ["Your story.", "Told properly."],
    heroIntro: `A content partnership proposal for ${clientName}.`,
    opportunity: {
      heading: "The business already works. The feed doesn't match it.",
      body: `${clientName} already has the product, the people and the reputation. What's missing is content that makes people feel it before they ever get in touch.\n\nMost decisions are now made on a phone, days ahead. Whoever looks the most alive in the feed wins the enquiry.`,
      stats: [
        { value: "1", label: "creative partner for strategy, production and publishing" },
        { value: "3", label: "platforms covered: Instagram, TikTok and YouTube Shorts" },
        { value: "7", label: "days a week your competitors are posting — the market never stops scrolling" },
      ],
    },
    whyNow: {
      heading: "The feed is the new front door.",
      body: "Your market is crowded and fiercely visual. The brands that win attention aren't always the best — they're the ones that show up, consistently, looking the part. Content is no longer marketing on the side of the business. It is the top of the funnel.",
      cards: [
        { title: "Discovery has moved", text: "People search Instagram and TikTok before they ever open Google or Maps." },
        { title: "The business is the advert", text: "What you do every day is built to be filmed. Most of that footage is never captured." },
        { title: "Consistency compounds", text: "One viral clip fades. A steady stream builds a presence competitors can't catch up to." },
        { title: "One partner, one engine", text: "Strategy, shooting, editing and posting under one roof — one look, one rhythm, one plan." },
      ],
    },
    create: {
      heading: "Content built to be watched.",
      body: "A rotating mix of cinematic and native short-form, designed to make you impossible to scroll past.",
      pillars: [
        { title: "Hero content", text: "Slow, close, cinematic shots of the thing people come back for." },
        { title: "The experience", text: "Atmosphere and detail — selling the feeling of being there." },
        { title: "Customer moments", text: "Real people and real reactions — authentic social proof." },
        { title: "Behind the scenes", text: "The team, the craft, the details — the human side that builds loyalty." },
        { title: "Trending formats", text: "Fast, reactive content that keeps you culturally current." },
        { title: "Cinematic brand film", text: "A premium hero piece for ads, your website and launches." },
      ],
    },
    process: {
      heading: "From idea to posted.",
      steps: [
        { title: "Discovery", text: "We get to know the business — the space, the offer, the customers and the goals." },
        { title: "Strategy", text: "One content plan — pillars, a consistent look and a monthly calendar." },
        { title: "Shoot", text: "Efficient shoot days planned around your business, not the other way round." },
        { title: "Edit", text: "Cut, graded, sound-designed and captioned — cinematic where it counts, native where it performs." },
        { title: "Publish", text: "Scheduled and posted across Instagram, TikTok and Shorts, in the right rhythm." },
        { title: "Review", text: "Monthly reporting — what worked, what to scale, where the enquiries came from." },
      ],
    },
    investment: {
      heading: "A partnership built around you.",
      price: "Bespoke",
      priceNote: "scoped to your goals",
      body: "A monthly retainer covering strategy, production and publishing — priced for the volume of content and the goals we agree together.",
      includes: ["Strategy, production & publishing", "Cinematic + native mix", "One team, one schedule", "Monthly reporting"],
    },
    close: {
      heading: "Let's make you impossible to miss.",
      body: `The business is ready. The audience is out there every day. All that's missing is the content that keeps ${clientName} in front of them — consistently, and looking like the best in the city.`,
    },
  };
}
