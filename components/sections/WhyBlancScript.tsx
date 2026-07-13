import { differentiators } from "@/data/process";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowUpRight } from "lucide-react";

/** Differentiators grid — confident, specific, no unrealistic claims. */
export function WhyBlancScript() {
  return (
    <section className="py-section" aria-labelledby="why-heading">
      <div className="shell">
        <SectionHeading
          id="why-heading"
          eyebrow="Why Blanc Script"
          title={<>Built to make the work <span className="text-coral">count</span>.</>}
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-charcoal/12 bg-charcoal/12 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map((d, i) => (
            <Reveal
              as="div"
              key={d.title}
              delay={(i % 4) * 0.05}
              className="group flex flex-col bg-cream p-7 transition-colors hover:bg-white"
            >
              <ArrowUpRight
                className="mb-5 h-5 w-5 text-teal-dark transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
              <h3 className="font-display text-lg font-semibold text-charcoal">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-soft">{d.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
