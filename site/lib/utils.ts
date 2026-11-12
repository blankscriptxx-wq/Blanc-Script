/**
 * Tiny classNames joiner. Filters falsy values so you can write
 * cn("base", condition && "extra").
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a plain integer with thousands separators (e.g. 1200000 → "1,200,000"). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

/** Slugify a string for URLs (kept simple; matches project ids in data). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
