import { aiConfigured } from "@/lib/ai/claude";
import { clientsDueResearch, logScheduledResearch, runClientResearch } from "@/lib/data/research-job";

export const dynamic = "force-dynamic";
// Each client takes roughly a minute of web research.
export const maxDuration = 300;

const PER_RUN = 3;
const BUDGET_MS = 230_000;

/**
 * Daily scheduled job (see vercel.json): refreshes web research for clients
 * that haven't been researched in 30 days, a few per run. New findings are
 * proposed to each client's brain for approval — nothing is auto-approved.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  if (!aiConfigured()) return Response.json({ ok: true, skipped: "AI not configured" });

  const started = Date.now();
  const due = await clientsDueResearch(PER_RUN);
  const results: { client: string; proposed?: number; error?: string }[] = [];

  for (const c of due) {
    if (Date.now() - started > BUDGET_MS) break;
    try {
      const { proposed } = await runClientResearch(c.orgId, c.clientId);
      await logScheduledResearch(c.orgId, c.clientId, proposed);
      results.push({ client: c.name, proposed });
    } catch (e) {
      results.push({ client: c.name, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return Response.json({ ok: true, due: due.length, results });
}
