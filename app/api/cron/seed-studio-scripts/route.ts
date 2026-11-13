import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import statements from "@/lib/seed/studio-scripts.json";

export const dynamic = "force-dynamic";

/**
 * One-off: loads the nine Blanc Script studio scripts (with their deliverables
 * and content items) for the "Blanc Script" client. Safe to call twice — it
 * does nothing once the scripts exist. Removed again straight after use.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-seed-token") !== "C1-HQGQ1-bfjIkkeYf0bX5wgD_CZHmLLYHYTE_r-VPI") return new Response("Not found", { status: 404 });
  const db = getDb();
  const { rows } = await db.execute(sql`
    select count(*)::int as n from scripts s join clients c on c.id = s.client_id where c.name = 'Blanc Script'
  `);
  if (Number((rows[0] as { n: number }).n) > 0) return Response.json({ ok: true, skipped: "already loaded" });
  let done = 0;
  for (const statement of statements as string[]) {
    await db.execute(sql.raw(statement));
    done += 1;
  }
  return Response.json({ ok: true, loaded: done });
}
