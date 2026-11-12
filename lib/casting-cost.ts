/** Client-safe helpers for talent-booking costs (no server-only imports). */

export type CostOwner = "client" | "agency";

/** Cost of a booking: effective hourly rate × hours worked. Null if unknown. */
export function bookingCostPence(
  agreedRatePence: number | null,
  talentRatePence: number | null,
  durationMinutes: number | null,
): number | null {
  const rate = agreedRatePence ?? talentRatePence;
  if (rate == null || durationMinutes == null) return null;
  return Math.round((rate * durationMinutes) / 60);
}
