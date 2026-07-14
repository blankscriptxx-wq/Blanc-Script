"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { bunnyEmbedUrl } from "@/lib/bunny";
import { BunnyThumb } from "./BunnyThumb";

/**
 * Bunny Stream player embed with a click-to-play facade (thumbnail + coral play
 * button). Brandless, adaptive streaming; the iframe only loads on click so
 * pages stay fast. `guid` is the per-video ID from the Stream library.
 */
export function BunnyEmbed({
  guid,
  title,
  vertical = false,
  className,
}: {
  guid: string;
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
          src={`${bunnyEmbedUrl(guid)}?autoplay=true&preload=true&responsive=true`}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <BunnyThumb guid={guid} alt={title} />
          <span className="absolute inset-0 bg-charcoal-deep/25 transition-colors group-hover:bg-charcoal-deep/10" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-coral text-white shadow-lg transition-transform duration-300 ease-editorial group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
