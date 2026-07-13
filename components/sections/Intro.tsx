import { Reveal } from "@/components/ui/Reveal";

/**
 * Agency introduction. Big editorial statement — "Most agencies start with
 * content. We start with strategy." — with concise supporting copy.
 */
export function Intro() {
  return (
    <section id="intro" className="scroll-mt-24 py-section" aria-labelledby="intro-heading">
      <div className="shell">
        <Reveal>
          <p className="eyebrow mb-8 text-teal-dark">The Blanc Script difference</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 id="intro-heading" className="max-w-5xl text-display-sm font-semibold leading-[1.05] text-charcoal md:text-display-md">
            Most agencies start with content.{" "}
            <span className="text-charcoal/35">We start with</span>{" "}
            <span className="script-underline text-charcoal">strategy</span>.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 border-t border-charcoal/10 pt-12 md:grid-cols-3">
          {[
            {
              t: "Creative direction",
              d: "We shape the idea and the look before anyone picks up a camera — so every asset earns its place.",
            },
            {
              t: "Cinematic production",
              d: "Film and photography made to a standard that lifts how people perceive the whole brand.",
            },
            {
              t: "Social strategy",
              d: "Content built for how platforms actually work, managed and measured against real growth.",
            },
          ].map((col, i) => (
            <Reveal key={col.t} delay={i * 0.08}>
              <div>
                <h3 className="font-display text-lg font-semibold text-charcoal">{col.t}</h3>
                <p className="mt-3 leading-relaxed text-charcoal-soft">{col.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
