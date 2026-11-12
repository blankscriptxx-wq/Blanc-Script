/** Client-safe helpers for talent-booking costs (no server-only imports). */

export type CostOwner = "client" | "agency";
export type RateMode = "hourly" | "day";

export type BookingCostArgs = {
  mode: RateMode;
  /** Override amount: an hourly rate in hourly mode, or a day rate in day mode. */
  agreedRatePence: number | null;
  talentHourlyPence: number | null;
  talentDayPence: number | null;
  durationMinutes: number | null;
  dayCount?: number | null;
};

/**
 * Cost of a booking.
 * - Day mode: the agreed day amount (else the talent's standard day rate) × number of days.
 * - Hourly mode: effective hourly rate × hours worked.
 * Returns null when the inputs needed are missing.
 */
export function bookingCostPence(args: BookingCostArgs): number | null {
  if (args.mode === "day") {
    const amount = args.agreedRatePence ?? args.talentDayPence;
    if (amount == null) return null;
    const days = args.dayCount && args.dayCount > 0 ? args.dayCount : 1;
    return amount * days;
  }
  const rate = args.agreedRatePence ?? args.talentHourlyPence;
  if (rate == null || args.durationMinutes == null) return null;
  return Math.round((rate * args.durationMinutes) / 60);
}
