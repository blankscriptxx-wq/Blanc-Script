import { processSteps } from "@/data/process";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The five-stage method on a charcoal band. A connected vertical timeline on
 * mobile, a horizontal stepped row on larger screens.
 */
export function Process() {
  return (
    <section className="grain relative overflow-hidden bg-charcoal py-section text-cream" aria-labelledby="process-heading">
      <div className="shell">
        <SectionHeading
          id="process-heading"
          tone="light"
          eyebrow="How we work"
          title={<>A method, not a <span className="text-teal">mood board</span>.</>}
          intro="Five stages that keep creative accountable to the brief — and the business."
        />

        <ol className="mt-16 grid gap-y-10 md:grid-cols-5 md:gap-x-6">
          {processSteps.map((step, i) => (
            <Reveal as="li" key={step.number} delay={i * 0.06} className="relative">
              <div className="flex items-center gap-4 md:block">
                <span className="font-display text-5xl font-bold text-teal md:text-6xl">
                  {step.number}
                </span>
                <div className="mt-0 h-px flex-1 bg-cream/15 md:mt-6 md:w-full" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-cream md:mt-6">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                {step.description}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
