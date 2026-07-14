"use client";

import { cn } from "@/lib/utils";
import { bunnyThumb } from "@/lib/bunny";

/** Bunny Stream auto-generated thumbnail as a plain <img> (for cards/covers). */
export function BunnyThumb({
  guid,
  alt,
  className,
}: {
  guid: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bunnyThumb(guid)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
