import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects, getProject, getNextProject } from "@/site/data/projects";
import { buildMetadata } from "@/site/data/seo";
import {
  JsonLd,
  breadcrumbSchema,
  videoSchema,
} from "@/site/components/seo/JsonLd";
import { CaseStudy } from "@/site/components/portfolio/CaseStudy";

type Params = { params: Promise<{ slug: string }> };

// Pre-render every case study at build time.
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return buildMetadata({
    title: `${project.title} — ${project.category} Case Study`,
    description: `${project.summary} ${project.challenge}`.slice(0, 155),
    path: `/portfolio/${project.slug}`,
    keywords: [project.industry, project.category, project.service],
  });
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const next = getNextProject(project.slug);
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Portfolio", path: "/portfolio" },
    { name: project.title, path: `/portfolio/${project.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {project.video?.youTubeId && (
        <JsonLd
          data={videoSchema({
            name: `${project.title} — ${project.service}`,
            description: project.summary,
            thumbnailUrl: `https://i.ytimg.com/vi/${project.video.youTubeId}/hqdefault.jpg`,
            uploadDate: `${project.year}-01-01`,
            contentUrl: `https://www.youtube.com/watch?v=${project.video.youTubeId}`,
          })}
        />
      )}
      <CaseStudy project={project} next={next} />
    </>
  );
}
