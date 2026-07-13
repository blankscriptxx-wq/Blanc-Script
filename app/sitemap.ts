import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { projects } from "@/data/projects";

/** Dynamic sitemap — includes static routes + every case study. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    { url: "/", changeFrequency: "monthly", priority: 1 },
    { url: "/services", changeFrequency: "monthly", priority: 0.9 },
    { url: "/portfolio", changeFrequency: "weekly", priority: 0.9 },
    { url: "/about", changeFrequency: "monthly", priority: 0.7 },
    { url: "/contact", changeFrequency: "yearly", priority: 0.8 },
    { url: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
    { url: "/terms", changeFrequency: "yearly", priority: 0.2 },
  ] as const;

  const staticRoutes: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${site.url}${r.url === "/" ? "" : r.url}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${site.url}/portfolio/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}
