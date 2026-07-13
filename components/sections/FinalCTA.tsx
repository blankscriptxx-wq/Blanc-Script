import { cta } from "@/data/navigation";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/** Closing call-to-action — the brand line, front and centre. */
export function FinalCTA() {
  return (
    <section className="grain relative overflow-hidden bg-charcoal-deep py-section text-cream" aria-labelledby="final-cta-heading">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-coral/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-teal/15 blur-3xl" />
      </div>
      <div className="shell relative text-center">
        <Reveal>
          <p className="eyebrow mb-6 text-teal">Start here</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 id="final-cta-heading" className="mx-auto max-w-4xl text-display-md font-bold leading-[1.02] md:text-display-lg">
            Every great brand starts with a{" "}
            <span className="script-underline text-coral">Blanc Script</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-cream/70">
            Let&apos;s build yours. Tell us where you want to take the brand — we&apos;ll
            bring the strategy and the craft.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={cta.primary.href} variant="primary" size="lg" withArrow>
              {cta.primary.label}
            </Button>
            <Button href={cta.secondary.href} variant="light" size="lg">
              {cta.secondary.label}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
