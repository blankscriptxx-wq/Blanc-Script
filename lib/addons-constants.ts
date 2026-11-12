/** Client-safe add-on cadence constants (no server-only imports). */

export type AddonCadence = "monthly" | "one_off" | "hourly" | "per_job" | "bespoke";

export const ADDON_CADENCES: readonly AddonCadence[] = [
  "monthly",
  "one_off",
  "hourly",
  "per_job",
  "bespoke",
];

export const ADDON_CADENCE_LABELS: Record<AddonCadence, string> = {
  monthly: "Monthly",
  one_off: "One-off",
  hourly: "Hourly",
  per_job: "Per job",
  bespoke: "Bespoke",
};
