import Image from "next/image";
import { cn } from "@/lib/utils";
import { Film, Camera, ImageIcon, Clapperboard } from "lucide-react";
import type { MediaRef } from "@/data/types";

type MediaPlaceholderProps = {
  media?: MediaRef;
  /** Alt / descriptive label — always required for accessibility. */
  label: string;
  className?: string;
  /** Tailwind aspect-ratio class, e.g. "aspect-[4/5]", "aspect-video". */
  ratio?: string;
  /** Visual accent used by the fallback gradient. */
  accent?: "cream" | "teal" | "gold" | "coral" | "charcoal";
  rounded?: boolean;
  priority?: boolean;
  sizes?: string;
};

const accents: Record<NonNullable<MediaPlaceholderProps["accent"]>, string> = {
  cream: "from-cream-deep via-cream to-white text-charcoal-soft",
  teal: "from-teal/80 via-teal to-teal-dark text-white",
  gold: "from-gold/80 via-gold to-gold-dark text-charcoal",
  coral: "from-coral via-coral to-coral-dark text-white",
  charcoal: "from-charcoal-soft via-charcoal to-charcoal-deep text-cream",
};

const kindIcon = {
  image: ImageIcon,
  video: Film,
  photo: Camera,
  reel: Clapperboard,
} as const;

/**
 * Renders real media when a `src` is supplied, otherwise an elegant, on-brand
 * placeholder. Every placeholder carries `data-placeholder` so the whole set
 * can be located with a single search when swapping in production assets.
 *
 * TO REPLACE: pass a `media` object with a `src` (image) or `videoSrc` +
 * `poster` (video). See data/types.ts → MediaRef and the README checklist.
 */
export function MediaPlaceholder({
  media,
  label,
  className,
  ratio = "aspect-[4/5]",
  accent = "charcoal",
  rounded = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: MediaPlaceholderProps) {
  const wrap = cn(
    "relative w-full overflow-hidden bg-charcoal",
    ratio,
    rounded && "rounded-card",
    className
  );

  // Real video (muted, looped, lazy, poster) — never autoplays with sound.
  if (media?.videoSrc) {
    return (
      <div className={wrap}>
        <video
          className="absolute inset-0 h-full w-full object-cover"
          poster={media.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
        >
          <source src={media.videoSrc} type="video/mp4" />
        </video>
      </div>
    );
  }

  // Real image
  if (media?.src) {
    return (
      <div className={wrap}>
        <Image
          src={media.src}
          alt={media.alt ?? label}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  // Elegant branded placeholder
  const Icon = kindIcon[media?.kind ?? "image"];
  return (
    <div
      data-placeholder="media"
      className={cn(
        wrap,
        "bg-gradient-to-br grid place-items-center",
        accents[accent]
      )}
    >
      <div className="grain absolute inset-0" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        <Icon className="h-8 w-8 opacity-70" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">
          {label}
        </span>
        <span className="text-[0.65rem] uppercase tracking-widest opacity-50">
          Replace media
        </span>
      </div>
    </div>
  );
}
