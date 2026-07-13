"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/types";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/utils";

const ratioByOrientation: Record<Project["orientation"], string> = {
  vertical: "aspect-[9/16]",
  horizontal: "aspect-[16/10]",
  square: "aspect-square",
};

/**
 * Editorial project card. Media zooms subtly and an overlay lifts on
 * hover/focus (desktop) — but ALL text is always visible, never hover-only,
 * so mobile and keyboard users get the full information.
 */
export function ProjectCard({
  project,
  className,
  priority = false,
}: {
  project: Project;
  className?: string;
  priority?: boolean;
}) {
  const reduce = useReducedMotion();
  const href = `/portfolio/${project.slug}`;

  return (
    <Link
      href={href}
      className={cn("group block focus-visible:outline-none", className)}
      aria-label={`${project.title} — ${project.category} case study`}
    >
      <div className="relative overflow-hidden rounded-card">
        <motion.div
          whileHover={reduce ? undefined : { scale: 1.04 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full"
        >
          <MediaPlaceholder
            media={project.cover}
            label={project.title}
            accent={project.accent}
            ratio={ratioByOrientation[project.orientation]}
            rounded={false}
            priority={priority}
          />
        </motion.div>

        {/* Hover overlay (decorative enhancement only) */}
        <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-charcoal-deep/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="m-5 inline-flex items-center gap-1.5 rounded-pill bg-cream px-4 py-2 text-sm font-semibold text-charcoal">
            View case study
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag tone="neutral">{project.category}</Tag>
            <span className="text-xs text-charcoal-soft">{project.year}</span>
          </div>
          <h3 className="font-display text-xl font-semibold text-charcoal transition-colors group-hover:text-coral">
            {project.title}
          </h3>
          <p className="mt-1 text-sm text-charcoal-soft">{project.summary}</p>
        </div>
        <ArrowUpRight
          className="mt-1 h-5 w-5 shrink-0 text-charcoal-soft transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-coral"
          aria-hidden
        />
      </div>
    </Link>
  );
}
