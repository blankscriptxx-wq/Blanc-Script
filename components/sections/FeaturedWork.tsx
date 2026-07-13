import { getFeaturedProjects } from "@/data/projects";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

/**
 * Selected work for the homepage — an editorial, asymmetric arrangement.
 * Links through to the full Portfolio and individual case studies.
 */
export function FeaturedWork() {
  const featured = getFeaturedProjects().slice(0, 3);

  return (
    <section className="py-section" aria-labelledby="work-heading">
      <div className="shell">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            id="work-heading"
            eyebrow="Selected work"
            title={<>Work that <span className="text-teal-dark">earns</span> attention.</>}
          />
          <div className="shrink-0">
            <Button href="/portfolio" variant="secondary" withArrow>
              View portfolio
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-12">
          {/* Lead project spans wide */}
          {featured[0] && (
            <Reveal className="lg:col-span-7">
              <ProjectCard project={featured[0]} priority />
            </Reveal>
          )}
          {featured[1] && (
            <Reveal delay={0.08} className="lg:col-span-5 lg:mt-16">
              <ProjectCard project={featured[1]} />
            </Reveal>
          )}
          {featured[2] && (
            <Reveal delay={0.12} className="lg:col-span-5">
              <ProjectCard project={featured[2]} />
            </Reveal>
          )}
          <Reveal delay={0.16} className="hidden lg:col-span-7 lg:flex">
            <div className="flex w-full flex-col justify-center rounded-card border border-charcoal/12 bg-cream-deep/40 p-10">
              <p className="font-serif text-2xl italic leading-snug text-charcoal">
                &ldquo;Every project starts with one question: what should this brand
                be remembered for?&rdquo;
              </p>
              <div className="mt-8">
                <Button href="/portfolio" withArrow>
                  Explore all projects
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
