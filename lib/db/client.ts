import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { schema } from "./schema";

/**
 * Database client — Neon Postgres over HTTPS (@neondatabase/serverless), Drizzle.
 * HTTP driver suits Vercel serverless and works behind the agent proxy.
 * Connection from DATABASE_URL (Vercel–Neon integration / .env.local).
 *
 * RLS: once policies land, per-request identity is passed to Neon Authorize via
 * the Neon Auth JWT; see docs/SECURITY_AND_PRIVACY.md.
 */

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No DATABASE_URL. Provision Neon (Vercel–Neon integration) or set .env.local.",
    );
  }
  if (!_db) {
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export { schema };
