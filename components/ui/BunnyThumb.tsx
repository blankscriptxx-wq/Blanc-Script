"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { bunnyThumb } from "@/lib/bunny";

/**
 * Bunny Stream auto-generated thumbnail as a plain <img> (for cards/covers).
 * If the CDN thumbnail isn't public/ready, it hides cleanly, leaving the
 * charcoal card background rather than a broken-image icon.
 */
export function BunnyThumb({
  guid,
  alt,
  className,
}: {
  guid: string;
  alt: string;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bunnyThumb(guid)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setOk(false)}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
