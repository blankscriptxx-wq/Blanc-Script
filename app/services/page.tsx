import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/data/seo";
import { services } from "@/data/services";
import { projects } from "@/data/projects";
import { site } from "@/data/site";
import {
  JsonLd,
  breadcrumbSchema,
  serviceSchema,
} from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { ServiceDetail } from "@/components/services/ServiceDetail";
import { EngagementModels } from "@/components/services/EngagementModels";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Button } from "@/components/ui/Button";
import { cta } from "@/data/navigation";

export const metadata: Metadata = buildMetadata(pageSeo.services);

// Map each service to a related placeholder project (by service text overlap).
function relatedFor(serviceTitle: string) {
  return projects.find((p) =>
    serviceTitle.toLowerCase().includes(p.category.toLowerCase())
  ) ?? projects.find((p) => p.service.length > 0);
}

export default function ServicesPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {services.map((s) => (
        <JsonLd key={s.slug} data={serviceSchema(s.title, s.description)} />
      ))}

      <PageHero
        eyebrow="Services"
        breadcrumbs={breadcrumbs}
        title={<>Strategy, production and social — <span className="text-coral">joined up</span>.</>}
        intro={
          <>
            Six services that work best together: a clear plan, cinematic craft,
            and content built to perform on the platforms your audience actually uses.
            Based in {site.location.city}, working nationwide and internationally.
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <a
              key={s.slug}
              href={`#${s.slug}`}
              className="rounded-pill border border-charcoal/20 px-4 py-2 text-sm text-charcoal transition-colors hover:border-charcoal hover:bg-charcoal hover:text-cream"
            >
              {s.short}
            </a>
          ))}
        </div>
      </PageHero>

      <div>
        {services.map((service, i) => (
          <ServiceDetail
            key={service.slug}
            service={service}
            index={i}
            related={relatedFor(service.title)}
          />
        ))}
      </div>

      <EngagementModels />

      <section className="py-section">
        <div className="shell flex flex-col items-start gap-6 rounded-card bg-cream-deep/50 p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div>
            <h2 className="text-display-sm font-semibold text-charcoal">Have a brief in mind?</h2>
            <p className="mt-3 max-w-lg text-charcoal-soft">
              Send it over. We&apos;ll come back with a clear, tailored approach.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={cta.primary.href} size="lg" withArrow>
              {cta.primary.label}
            </Button>
            <Button href={cta.secondary.href} variant="secondary" size="lg">
              {cta.secondary.label}
            </Button>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
