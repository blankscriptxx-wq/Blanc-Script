import { runFollowUps } from "@/lib/data/followups";
import { runMonthlyProjects } from "@/lib/data/monthly-projects";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily follow-up emails (see vercel.json): unfinished onboarding, documents
 * awaiting acceptance, overdue invoices and cuts awaiting review. Also opens
 * each package client's project for the month.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  const projects = await runMonthlyProjects().catch(() => -1);
  return Response.json({ ok: true, projects, sent: await runFollowUps() });
}
