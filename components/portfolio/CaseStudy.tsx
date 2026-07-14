import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import type { Project } from "@/data/types";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Reveal } from "@/components/ui/Reveal";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { cta } from "@/data/navigation";

/**
 * Reusable case study template. Drives every /portfolio/[slug] page from a
 * single Project object. Sections render only when their data is present, so
 * a short clip (video only) and a full case study both look intentional.
 */
export function CaseStudy({ project, next }: { project: Project; next: Project }) {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Portfolio", path: "/portfolio" },
    { name: project.title, path: `/portfolio/${project.slug}` },
  ];

  const facts = [
    { label: "Client", value: project.client },
    { label: "Industry", value: project.industry },
    { label: "Service", value: project.service },
    { label: "Year", value: project.year },
  ].filter((f) => f.value);

  const media = project.video ?? project.cover;
  const vertical = project.orientation === "vertical";
  const hasNarrative = project.challenge || project.strategy || project.approach;

  return (
    <>
      <PageHero
        eyebrow={project.category}
        breadcrumbs={breadcrumbs}
        title={project.title}
        intro={project.summary}
      />

      {/* Video / cover + sticky fact sheet */}
      <section className="pb-section">
        <div className="shell grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <Reveal>
            {media.videoSrc ? (
              <VideoPlayer src={media.videoSrc} poster={media.poster} title={project.title} vertical={vertical} />
            ) : media.youTubeId ? (
              <YouTubeEmbed id={media.youTubeId} title={project.title} vertical={vertical} />
            ) : (
              <MediaPlaceholder
                media={media}
                label={`${project.title} — cover`}
                accent={project.accent}
                ratio={vertical ? "aspect-[9/16]" : "aspect-video"}
                priority
                sizes="(max-width: 1024px) 100vw, 65vw"
              />
            )}
          </Reveal>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-card border border-charcoal/12 bg-white/60 p-7">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="eyebrow text-charcoal/40">{f.label}</dt>
                  <dd className="mt-1.5 font-medium text-charcoal">{f.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* Narrative */}
      {hasNarrative && (
        <section className="pb-section">
          <div className="shell grid gap-x-12 gap-y-10 md:grid-cols-3">
            {[
              { h: "The challenge", b: project.challenge },
              { h: "The strategy", b: project.strategy },
              { h: "The creative approach", b: project.approach },
            ]
              .filter((blk) => blk.b)
              .map((blk, i) => (
                <Reveal as="div" key={blk.h} delay={i * 0.06}>
                  <h2 className="font-display text-xl font-semibold text-charcoal">{blk.h}</h2>
                  <p className="mt-3 leading-relaxed text-charcoal-soft">{blk.b}</p>
                </Reveal>
              ))}
          </div>
        </section>
      )}

      {/* Deliverables + results */}
      {(project.deliverables?.length || project.results?.length) && (
        <section className="bg-cream-deep/40 py-section">
          <div className="shell grid gap-12 lg:grid-cols-2">
            {project.deliverables?.length ? (
              <div>
                <h2 className="eyebrow mb-6 text-charcoal/40">Deliverables</h2>
                <ul className="flex flex-wrap gap-2">
                  {project.deliverables.map((d) => (
                    <li key={d}>
                      <Tag tone="neutral">{d}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {project.results?.length ? (
              <div>
                <h2 className="eyebrow mb-6 text-charcoal/40">Results</h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {project.results.map((r) => (
                    <div key={r.label} className="min-w-0 rounded-card border border-charcoal/12 bg-white/70 p-5">
                      <dt className="text-xs uppercase tracking-wider text-charcoal/50">{r.label}</dt>
                      <dd className="mt-2 break-words font-display text-xl font-bold text-coral sm:text-2xl">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Gallery */}
      {project.gallery && project.gallery.length > 0 && (
        <section className="py-section">
          <div className="shell">
            <h2 className="eyebrow mb-8 text-charcoal/40">Gallery</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {project.gallery.map((m, i) => (
                <Reveal as="div" key={i} delay={(i % 3) * 0.06}>
                  <MediaPlaceholder
                    media={m}
                    label={`${project.title} — image ${i + 1}`}
                    accent={project.accent}
                    ratio="aspect-[4/3]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial */}
      {project.testimonial && (
        <section className="pb-section">
          <div className="shell">
            <figure className="rounded-card border border-charcoal/12 bg-white/70 p-8 md:p-12">
              <Quote className="mb-5 h-9 w-9 text-teal/40" aria-hidden />
              <blockquote className="max-w-3xl font-serif text-2xl italic leading-snug text-charcoal md:text-3xl">
                &ldquo;{project.testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 text-sm text-charcoal-soft">
                {project.testimonial.attribution}
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      {/* Next project + CTA */}
      <section className="grain border-t border-charcoal/10 bg-charcoal py-section text-cream">
        <div className="shell grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3 text-teal">Next project</p>
            <Link href={`/portfolio/${next.slug}`} className="group inline-flex items-center gap-3">
              <span className="font-display text-3xl font-semibold text-cream transition-colors group-hover:text-teal md:text-4xl">
                {next.title}
              </span>
              <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <p className="mt-2 text-cream/60">{next.summary}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button href={cta.primary.href} variant="primary" size="lg" withArrow>
              {cta.primary.label}
            </Button>
            <Button href="/portfolio" variant="light" size="lg">
              All work
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
