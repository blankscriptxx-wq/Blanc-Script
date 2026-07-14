import { cn } from "@/lib/utils";
import { bunnyEmbedUrl } from "@/lib/bunny";

/**
 * Bunny Stream player (brandless). Uses Bunny's own lazy poster + play button
 * via `preload=false`, so the video only downloads on play and we don't depend
 * on the CDN thumbnail being public. `guid` is the per-video ID.
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
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`${bunnyEmbedUrl(guid)}?preload=false&responsive=true`}
        title={title}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
}
