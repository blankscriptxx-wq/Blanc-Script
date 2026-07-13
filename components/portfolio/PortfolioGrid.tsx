"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Project, ProjectCategory } from "@/data/types";
import { projectCategories } from "@/data/projects";
import { ProjectCard } from "./ProjectCard";
import { cn } from "@/lib/utils";

/**
 * Filterable portfolio grid. Filters are real <button>s with aria-pressed and
 * scroll horizontally on mobile (no hidden controls). Cards animate on filter
 * change; layout is a responsive masonry-style column grid so vertical (9:16)
 * and horizontal covers sit naturally together.
 */
export function PortfolioGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<"All" | ProjectCategory>("All");
  const reduce = useReducedMotion();

  const filtered = useMemo(
    () => (active === "All" ? projects : projects.filter((p) => p.category === active)),
    [active, projects]
  );

  return (
    <div>
      {/* Filters */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0">
        {projectCategories.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 rounded-pill border px-4 py-2 text-sm font-medium transition-colors min-h-[44px]",
                isActive
                  ? "border-charcoal bg-charcoal text-cream"
                  : "border-charcoal/20 text-charcoal hover:border-charcoal"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid — CSS columns preserve each cover's native aspect ratio */}
      <motion.div layout className="mt-10 gap-6 md:columns-2 lg:columns-3 [column-fill:_balance]">
        <AnimatePresence mode="popLayout">
          {filtered.map((project, i) => (
            <motion.div
              key={project.slug}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 break-inside-avoid"
            >
              <ProjectCard project={project} priority={i < 3} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-charcoal-soft">No projects in this category yet.</p>
      )}
    </div>
  );
}
