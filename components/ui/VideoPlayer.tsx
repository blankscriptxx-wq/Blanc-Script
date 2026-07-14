"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brandless native video player for self-hosted / CDN files (no third-party
 * logos or end-screens). Shows a poster + coral play button, then plays with
 * sound and the browser's clean native controls. `preload="none"` keeps pages
 * fast — nothing downloads until the visitor hits play.
 *
 * `src` = a direct video URL (.mp4 works everywhere; .webm as an optional
 * fallback). `poster` = a still image URL (recommended, prevents a black frame).
 */
export function VideoPlayer({
  src,
  poster,
  title,
  vertical = false,
  className,
}: {
  src: string;
  poster?: string;
  title: string;
  vertical?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const ratio = vertical ? "aspect-[9/16]" : "aspect-video";

  function play() {
    setStarted(true);
    requestAnimationFrame(() => ref.current?.play().catch(() => {}));
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-card bg-charcoal",
        ratio,
        vertical && "mx-auto max-w-[420px]",
        className
      )}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls={started}
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
        title={title}
      />

      {!started && (
        <button
          type="button"
          onClick={play}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <span className="absolute inset-0 bg-charcoal-deep/25 transition-colors group-hover:bg-charcoal-deep/10" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-coral text-white shadow-lg transition-transform duration-300 ease-editorial group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
