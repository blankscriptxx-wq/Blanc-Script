import { Check, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Service, Project } from "@/data/types";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { cta } from "@/data/navigation";
import { cn } from "@/lib/utils";

const accentText: Record<Service["accent"], string> = {
  coral: "text-coral",
  teal: "text-teal-dark",
  gold: "text-gold-dark",
};

/**
 * Full service block for the Services page: what it is, who it's for, what's
 * included, the business value, example deliverables, related work and a CTA.
 * Alternating media side for editorial rhythm.
 */
export function ServiceDetail({
  service,
  index,
  related,
}: {
  service: Service;
  index: number;
  related?: Project;
}) {
  const Icon = service.icon;
  const flip = index % 2 === 1;

  return (
    <article id={service.slug} className="scroll-mt-28 border-t border-charcoal/10 py-section first:border-t-0">
      <div className="shell">
        <div className={cn("grid gap-12 lg:grid-cols-2 lg:gap-16", flip && "lg:[direction:rtl]")}>
          {/* Text column */}
          <div className="lg:[direction:ltr]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-charcoal/6">
                <Icon className={cn("h-5 w-5", accentText[service.accent])} aria-hidden />
              </span>
              <span className="eyebrow text-charcoal/40">Service {String(index + 1).padStart(2, "0")}</span>
            </div>

            <Reveal>
              <h2 className="mt-6 text-display-sm font-semibold text-charcoal">{service.title}</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={cn("mt-2 font-serif text-xl italic", accentText[service.accent])}>
                {service.tagline}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 text-lg leading-relaxed text-charcoal-soft">{service.description}</p>
            </Reveal>

            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="eyebrow text-charcoal/40">Who it&apos;s for</dt>
                <dd className="mt-2 text-sm leading-relaxed text-charcoal-soft">{service.suitableFor}</dd>
              </div>
              <div>
                <dt className="eyebrow text-charcoal/40">The value</dt>
                <dd className="mt-2 text-sm leading-relaxed text-charcoal-soft">{service.value}</dd>
              </div>
            </dl>

            <div className="mt-8">
              <p className="eyebrow mb-4 text-charcoal/40">What&apos;s included</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex items-center gap-2 text-sm text-charcoal">
                    <Check className={cn("h-4 w-4 shrink-0", accentText[service.accent])} aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button href={`${cta.primary.href}?service=${service.slug}`} withArrow>
                Enquire about this
              </Button>
              {related && (
                <Link
                  href={`/portfolio/${related.slug}`}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:text-coral"
                >
                  Related work: {related.title}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              )}
            </div>
          </div>

          {/* Media column */}
          <div className="lg:[direction:ltr]">
            <Reveal>
              <MediaPlaceholder
                media={service.media}
                label={`${service.title} — example`}
                accent={service.accent}
                ratio="aspect-[4/5]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </Reveal>
            <div className="mt-4 flex flex-wrap gap-2">
              {service.examples.map((ex) => (
                <span key={ex} className="rounded-pill bg-charcoal/6 px-3 py-1 text-xs text-charcoal-soft">
                  {ex}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
