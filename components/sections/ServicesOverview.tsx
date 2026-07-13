import { services } from "@/data/services";
import { cta } from "@/data/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { staggerContainer } from "@/lib/motion";

/**
 * Homepage services overview — one of the most important sections. Interactive
 * card grid, each linking to the full Services page anchor.
 */
export function ServicesOverview() {
  return (
    <section id="services" className="scroll-mt-24 bg-cream-deep/40 py-section" aria-labelledby="services-heading">
      <div className="shell">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            id="services-heading"
            eyebrow="What we do"
            title={<>Six ways we build <span className="text-coral">momentum</span>.</>}
            intro="Strategy, production and social — under one roof, working to one plan."
          />
          <div className="shrink-0">
            <Button href="/services" variant="secondary" withArrow>
              All services
            </Button>
          </div>
        </div>

        <Reveal variants={staggerContainer(0.06)} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Reveal key={service.slug} as="div">
              <ServiceCard service={service} className="h-full" />
            </Reveal>
          ))}
        </Reveal>

        <div className="mt-12 flex flex-col items-start gap-4 rounded-card border border-charcoal/12 bg-white/60 p-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-charcoal-soft">
            Not sure which you need? Tell us the goal and we&apos;ll shape the right mix.
          </p>
          <Button href={cta.primary.href} withArrow>
            {cta.primary.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
