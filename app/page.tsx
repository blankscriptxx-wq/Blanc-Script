import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/data/seo";
import { faqs } from "@/data/faqs";
import { JsonLd, faqSchema } from "@/components/seo/JsonLd";
import { Hero } from "@/components/sections/Hero";
import { IndustryStrip } from "@/components/sections/IndustryStrip";
import { Intro } from "@/components/sections/Intro";
import { ServicesOverview } from "@/components/sections/ServicesOverview";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { Process } from "@/components/sections/Process";
import { WhyBlancScript } from "@/components/sections/WhyBlancScript";
import { Results } from "@/components/sections/Results";
import { Testimonials } from "@/components/sections/Testimonials";
import { AboutPreview } from "@/components/sections/AboutPreview";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { FAQ } from "@/components/sections/FAQ";

export const metadata: Metadata = buildMetadata(pageSeo.home);

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <Hero />
      <IndustryStrip />
      <Intro />
      <ServicesOverview />
      <FeaturedWork />
      <Process />
      <WhyBlancScript />
      <Results />
      <Testimonials />
      <AboutPreview />
      <FAQ />
      <FinalCTA />
    </>
  );
}
