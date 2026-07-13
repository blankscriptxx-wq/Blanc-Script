import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

type Crumb = { name: string; path: string };

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  breadcrumbs?: Crumb[];
  children?: ReactNode;
  align?: "left" | "center";
};

/** Consistent interior-page header with visible breadcrumb trail. */
export function PageHero({
  eyebrow,
  title,
  intro,
  breadcrumbs,
  children,
  align = "left",
}: PageHeroProps) {
  return (
    <header className="relative overflow-hidden pt-32 md:pt-40">
      <div aria-hidden className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full bg-teal/15 blur-3xl" />
      <div className={cn("shell relative pb-12 md:pb-16", align === "center" && "text-center")}>
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className={cn("mb-8", align === "center" && "flex justify-center")}>
            <ol className="flex flex-wrap items-center gap-1 text-xs text-charcoal-soft">
              {breadcrumbs.map((c, i) => (
                <li key={c.path} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />}
                  {i < breadcrumbs.length - 1 ? (
                    <Link href={c.path} className="hover:text-coral">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-charcoal" aria-current="page">
                      {c.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <Reveal>
          <p className={cn("eyebrow mb-5 flex items-center gap-3 text-coral", align === "center" && "justify-center")}>
            <span className="inline-block h-px w-8 bg-current opacity-60" aria-hidden />
            {eyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className={cn("text-display-md font-bold text-charcoal md:text-display-lg", align === "center" && "mx-auto max-w-4xl")}>
            {title}
          </h1>
        </Reveal>
        {intro && (
          <Reveal delay={0.1}>
            <div className={cn("mt-6 max-w-2xl text-lg leading-relaxed text-charcoal-soft", align === "center" && "mx-auto")}>
              {intro}
            </div>
          </Reveal>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}
