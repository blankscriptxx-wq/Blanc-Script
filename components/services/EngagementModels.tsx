import { engagementModels } from "@/data/services";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

const accentBar: Record<string, string> = {
  coral: "bg-coral",
  teal: "bg-teal",
  gold: "bg-gold",
};

/** Engagement / ways-of-working section. No fixed prices — scope-led. */
export function EngagementModels() {
  return (
    <section className="bg-cream-deep/40 py-section" aria-labelledby="models-heading">
      <div className="shell">
        <SectionHeading
          id="models-heading"
          eyebrow="Ways to work together"
          title={<>Pick the model, not the <span className="text-teal-dark">package</span>.</>}
          intro="From a single project to an ongoing partnership. We scope around your goals — pricing follows the brief, not a menu."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {engagementModels.map((m, i) => (
            <Reveal
              as="div"
              key={m.name}
              delay={(i % 3) * 0.06}
              className="flex flex-col overflow-hidden rounded-card border border-charcoal/12 bg-white/70"
            >
              <span className={cn("h-1.5 w-full", accentBar[m.accent])} aria-hidden />
              <div className="flex flex-1 flex-col p-7">
                <h3 className="font-display text-xl font-semibold text-charcoal">{m.name}</h3>
                <p className="mt-3 text-sm font-medium text-charcoal">{m.best}</p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{m.includes}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-sm text-charcoal/50">
          Pricing is quoted per project — no fixed public prices. Placeholder note: replace with your preferred pricing guidance if desired.
        </p>
      </div>
    </section>
  );
}
