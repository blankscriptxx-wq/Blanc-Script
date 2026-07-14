import { getFeaturedProjects } from "@/data/projects";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

/**
 * Homepage featured work — a wide lead film beside a pair of vertical reels.
 * Splitting the horizontal lead from the vertical reels keeps the heights
 * balanced and the section compact (no mixed-aspect grid gaps).
 */
export function FeaturedWork() {
  const featured = getFeaturedProjects().slice(0, 3);
  const [lead, ...rail] = featured;
  if (!lead) return null;

  return (
    <section className="py-section" aria-labelledby="work-heading">
      <div className="shell">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            id="work-heading"
            eyebrow="Selected work"
            title={<>Work that <span className="text-teal-dark">stands out</span>.</>}
          />
          <div className="shrink-0">
            <Button href="/portfolio" variant="secondary" withArrow>
              View portfolio
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Wide lead film */}
          <Reveal className="lg:col-span-7">
            <ProjectCard project={lead} priority />
          </Reveal>

          {/* Vertical reels, side by side — matches the lead's height */}
          {rail.length > 0 && (
            <div className="grid grid-cols-2 gap-6 lg:col-span-5">
              {rail.map((project, i) => (
                <Reveal key={project.slug} delay={0.08 + i * 0.06}>
                  <ProjectCard project={project} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
