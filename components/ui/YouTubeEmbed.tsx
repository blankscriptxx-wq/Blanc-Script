"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { YouTubeThumb } from "./YouTubeThumb";

/**
 * Lightweight YouTube embed with a "facade": shows the thumbnail + play button
 * and only loads the (heavy) iframe on click. Keeps pages fast — no third-party
 * player JS until the visitor actually wants to watch.
 */
export function YouTubeEmbed({
  id,
  title,
  vertical = false,
  className,
}: {
  id: string;
  title: string;
  vertical?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const ratio = vertical ? "aspect-[9/16]" : "aspect-video";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-card bg-charcoal",
        ratio,
        vertical && "mx-auto max-w-[420px]",
        className
      )}
    >
      {active ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          loading="lazy"
          allow="accelerated-charts; autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <YouTubeThumb id={id} alt={title} />
          <span className="absolute inset-0 bg-charcoal-deep/25 transition-colors group-hover:bg-charcoal-deep/10" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-coral text-white shadow-lg transition-transform duration-300 ease-editorial group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
