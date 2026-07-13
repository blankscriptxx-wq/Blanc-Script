import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Service } from "@/data/types";
import { cn } from "@/lib/utils";

const accentRing: Record<Service["accent"], string> = {
  coral: "hover:border-coral/50 [&_.svc-icon]:text-coral [&_.svc-icon-bg]:bg-coral/10",
  teal: "hover:border-teal/50 [&_.svc-icon]:text-teal-dark [&_.svc-icon-bg]:bg-teal/12",
  gold: "hover:border-gold/60 [&_.svc-icon]:text-gold-dark [&_.svc-icon-bg]:bg-gold/15",
};

/**
 * Service card used on the homepage overview grid. Shows a short description
 * plus a few key deliverables and links through to the Services page anchor.
 */
export function ServiceCard({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  const Icon = service.icon;
  return (
    <Link
      href={`/services#${service.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-card border border-charcoal/12 bg-white/60 p-7 transition-all duration-300 ease-editorial hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_50px_-24px_rgba(52,61,58,0.35)]",
        accentRing[service.accent],
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="svc-icon-bg grid h-12 w-12 place-items-center rounded-xl">
          <Icon className="svc-icon h-6 w-6" aria-hidden />
        </span>
        <ArrowUpRight
          className="h-5 w-5 text-charcoal-soft transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-charcoal"
          aria-hidden
        />
      </div>

      <h3 className="font-display text-xl font-semibold text-charcoal">
        {service.title}
      </h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-charcoal-soft">
        {service.description}
      </p>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-charcoal/10 pt-5">
        {service.deliverables.slice(0, 4).map((d) => (
          <li key={d} className="flex items-center gap-1.5 text-sm text-charcoal-soft">
            <Check className="h-3.5 w-3.5 text-teal-dark" aria-hidden />
            {d}
          </li>
        ))}
      </ul>
    </Link>
  );
}
