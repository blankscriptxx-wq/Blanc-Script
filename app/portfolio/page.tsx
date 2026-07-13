import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/data/seo";
import { projects } from "@/data/projects";
import { JsonLd, breadcrumbSchema } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata(pageSeo.portfolio);

export default function PortfolioPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Portfolio", path: "/portfolio" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <PageHero
        eyebrow="Portfolio"
        breadcrumbs={breadcrumbs}
        title={<>Selected <span className="text-teal-dark">work</span>.</>}
        intro="A cross-section of films, campaigns and content across the industries we work with. Every project below is placeholder content — swap in your real case studies."
      />

      <section className="pb-section" aria-label="Portfolio projects">
        <div className="shell">
          <PortfolioGrid projects={projects} />
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
