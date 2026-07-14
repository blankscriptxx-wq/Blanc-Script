import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/data/seo";
import { team, values } from "@/data/team";
import { industries } from "@/data/industries";
import { site } from "@/data/site";
import { JsonLd, breadcrumbSchema } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Tag } from "@/components/ui/Tag";

export const metadata: Metadata = buildMetadata(pageSeo.about);

export default function AboutPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <PageHero
        eyebrow="About"
        breadcrumbs={breadcrumbs}
        title={<>We build brands people <span className="text-coral">remember</span>.</>}
        intro={`Blanc Script is a strategy-led creative studio in ${site.location.city}. We pair creative direction and cinematic production with social strategy — so the work looks premium and does a job.`}
      />

      {/* Our story */}
      <section className="pb-section">
        <div className="shell grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <MediaPlaceholder media={{ kind: "photo" }} label="The studio" accent="charcoal" ratio="aspect-[4/5]" sizes="(max-width:1024px) 100vw, 50vw" />
          </Reveal>
          <div>
            <SectionHeading eyebrow="Our story" title="Made for the way brands grow now." />
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal-soft">
              <p>
                Blanc Script started from a simple frustration: too much content looks
                good and does nothing. Attention is earned, not bought — and it starts
                with a clear idea of what a brand should be known for.
              </p>
              <p>
                So we work the other way round. Strategy first, then the craft to match
                it: films, photography and social content built to a single standard and
                pointed at a real objective.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy + approach */}
      <section className="bg-cream-deep/40 py-section">
        <div className="shell grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our philosophy" title={<>The blank page is the <span className="text-teal-dark">point</span>.</>} />
            <p className="mt-6 text-lg leading-relaxed text-charcoal-soft">
              Every brand begins as a blank script. Our job is to write the story worth
              telling — then produce it with the quality it deserves. No templates, no
              recycled ideas, no content for the sake of a posting schedule.
            </p>
          </div>
          <div>
            <SectionHeading eyebrow="Our approach" title="Strategy, craft, then scale." />
            <p className="mt-6 text-lg leading-relaxed text-charcoal-soft">
              We plan before we produce, produce to a cinematic standard, and manage the
              rollout so momentum builds instead of resets. One team across strategy,
              production and social — accountable end to end.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-section">
        <div className="shell">
          <SectionHeading eyebrow="What we value" title={<>How we hold the <span className="text-coral">standard</span>.</>} />
          <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-charcoal/12 bg-charcoal/12 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal as="div" key={v.title} delay={(i % 3) * 0.05} className="bg-cream p-7">
                <span className="font-display text-2xl font-bold text-teal">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-charcoal">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-soft">{v.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="pb-section">
        <div className="shell">
          <SectionHeading eyebrow="Industries" title="Sharper work through sector focus." intro="We work across a range of industries — bringing category understanding to every brief." />
          <div className="mt-10 flex flex-wrap gap-3">
            {industries.map((ind) => (
              <Tag key={ind.slug} tone="neutral" className="text-sm">{ind.name}</Tag>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-cream-deep/40 py-section">
        <div className="shell">
          <SectionHeading eyebrow="The team" title="The founders behind the work." intro="Two disciplines, one standard — strategy and craft, held together from the first brief to the final cut." />
          <div className="mt-12 grid max-w-4xl gap-8 sm:grid-cols-2">
            {team.map((m, i) => (
              <Reveal as="div" key={i} delay={i * 0.08}>
                <MediaPlaceholder media={m.media} label={m.role} accent={i % 2 ? "teal" : "gold"} ratio="aspect-[4/5]" sizes="(max-width:640px) 100vw, 40vw" />
                <h3 className="mt-5 font-display text-xl font-semibold text-charcoal">{m.name}</h3>
                <p className="text-sm font-medium text-coral">{m.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-soft">{m.bio}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Behind the scenes */}
      <section className="py-section">
        <div className="shell">
          <SectionHeading eyebrow="Behind the scenes" title="On set." intro="Placeholder imagery — swap for real BTS from your shoots." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Reveal as="div" key={i} delay={i * 0.06}>
                <MediaPlaceholder media={{ kind: "photo" }} label={`Behind the scenes ${i + 1}`} accent={["coral", "teal", "gold"][i] as "coral" | "teal" | "gold"} ratio="aspect-[4/3]" sizes="(max-width:640px) 100vw, 33vw" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
