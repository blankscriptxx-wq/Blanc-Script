import Link from "next/link";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** "dark" for light backgrounds, "light" for charcoal backgrounds. */
  tone?: "dark" | "light";
  className?: string;
  href?: string | null;
};

/**
 * Text wordmark matching the Blanc Script logo: "BLANC" in the base ink,
 * "SCRIPT" in coral, with the signature teal full-stop. Rendered as type
 * (not an image) so it stays crisp, theme-adaptive and zero-layout-shift.
 */
export function Wordmark({ tone = "dark", className, href = "/" }: WordmarkProps) {
  const base = tone === "light" ? "text-cream" : "text-charcoal";
  const content = (
    <span
      className={cn(
        "font-display text-xl font-extrabold uppercase leading-none tracking-tight",
        base,
        className
      )}
    >
      Blanc<span className="text-coral">Script</span>
      <span className="text-teal">.</span>
    </span>
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      aria-label="Blanc Script — home"
      className="inline-flex items-center rounded focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
