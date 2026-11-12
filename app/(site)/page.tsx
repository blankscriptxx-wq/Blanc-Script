import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/site/data/seo";
import { faqs } from "@/site/data/faqs";
import { JsonLd, faqSchema } from "@/site/components/seo/JsonLd";
import { Hero } from "@/site/components/sections/Hero";
import { IndustryStrip } from "@/site/components/sections/IndustryStrip";
import { Intro } from "@/site/components/sections/Intro";
import { ServicesOverview } from "@/site/components/sections/ServicesOverview";
import { FeaturedWork } from "@/site/components/sections/FeaturedWork";
import { Process } from "@/site/components/sections/Process";
import { WhyBlancScript } from "@/site/components/sections/WhyBlancScript";
import { Results } from "@/site/components/sections/Results";
import { Testimonials } from "@/site/components/sections/Testimonials";
import { AboutPreview } from "@/site/components/sections/AboutPreview";
import { FinalCTA } from "@/site/components/sections/FinalCTA";
import { FAQ } from "@/site/components/sections/FAQ";

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
