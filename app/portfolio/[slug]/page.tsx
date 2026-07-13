import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects, getProject, getNextProject } from "@/data/projects";
import { buildMetadata } from "@/data/seo";
import { site } from "@/data/site";
import {
  JsonLd,
  breadcrumbSchema,
  videoSchema,
} from "@/components/seo/JsonLd";
import { CaseStudy } from "@/components/portfolio/CaseStudy";

type Params = { params: { slug: string } };

// Pre-render every case study at build time.
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const project = getProject(params.slug);
  if (!project) return {};
  return buildMetadata({
    title: `${project.title} — ${project.category} Case Study`,
    description: `${project.summary} ${project.challenge}`.slice(0, 155),
    path: `/portfolio/${project.slug}`,
    keywords: [project.industry, project.category, project.service],
  });
}

export default function CaseStudyPage({ params }: Params) {
  const project = getProject(params.slug);
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
      {project.video && (
        <JsonLd
          data={videoSchema({
            name: `${project.title} — ${project.service}`,
            description: project.summary,
            // ── PLACEHOLDER: point at a real thumbnail + hosted video URL
            thumbnailUrl: `${site.url}/opengraph-image`,
            uploadDate: `${project.year}-01-01`,
            contentUrl: project.video.videoSrc,
          })}
        />
      )}
      <CaseStudy project={project} next={next} />
    </>
  );
}
