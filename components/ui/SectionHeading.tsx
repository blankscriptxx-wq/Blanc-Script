import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  tone?: "dark" | "light"; // text tone; "light" for use on charcoal sections
  className?: string;
  id?: string;
};

/**
 * Consistent section header: eyebrow + oversized display title + optional intro.
 * Used across every page for a coherent editorial rhythm.
 */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "dark",
  className,
  id,
}: SectionHeadingProps) {
  const isLight = tone === "light";
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <p
            className={cn(
              "eyebrow mb-4 flex items-center gap-3",
              align === "center" && "justify-center",
              isLight ? "text-teal" : "text-coral"
            )}
          >
            <span className="inline-block h-px w-8 bg-current opacity-60" aria-hidden />
            {eyebrow}
          </p>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          id={id}
          className={cn(
            "text-display-sm md:text-display-md font-semibold",
            isLight ? "text-cream" : "text-charcoal"
          )}
        >
          {title}
        </h2>
      </Reveal>
      {intro && (
        <Reveal delay={0.1}>
          <div
            className={cn(
              "mt-6 text-lg leading-relaxed",
              isLight ? "text-cream/70" : "text-charcoal-soft"
            )}
          >
            {intro}
          </div>
        </Reveal>
      )}
    </div>
  );
}
