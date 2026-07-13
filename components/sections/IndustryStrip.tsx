import { industries } from "@/data/industries";
import { Marquee } from "@/components/ui/Marquee";

/**
 * Credibility strip — the industries Blanc Script works with. A dual-row
 * marquee on a charcoal band for cinematic contrast against the cream hero.
 * Establishes breadth without inventing client logos.
 */
export function IndustryStrip() {
  const item = (name: string) => (
    <span className="mx-6 inline-flex items-center gap-6 text-2xl font-semibold text-cream/80 md:mx-10 md:text-4xl">
      {name}
      <span className="text-teal" aria-hidden>
        ✦
      </span>
    </span>
  );

  const items = industries.map((i) => item(i.name));

  return (
    <section className="grain relative overflow-hidden bg-charcoal py-12 md:py-16" aria-label="Industries we work with">
      <p className="shell mb-8 text-center text-xs font-semibold uppercase tracking-[0.3em] text-cream/40">
        Trusted thinking for
      </p>
      <div className="space-y-4">
        <Marquee items={items} speed={45} />
        <Marquee items={[...items].reverse()} speed={55} reverse />
      </div>
    </section>
  );
}
