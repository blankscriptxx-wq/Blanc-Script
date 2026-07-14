"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * YouTube thumbnail as a plain <img> (no next/image remote config needed).
 * Tries the original-aspect-ratio thumbnail first (vertical for Shorts), then
 * falls back to the always-present hqdefault if that 404s.
 */
export function YouTubeThumb({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${id}/oardefault.jpg`);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setSrc(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
