import { runFollowUps } from "@/lib/data/followups";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily follow-up emails (see vercel.json): unfinished onboarding, documents
 * awaiting acceptance, overdue invoices and cuts awaiting review.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  return Response.json({ ok: true, sent: await runFollowUps() });
}
