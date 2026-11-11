import { schema } from "./schema";

/**
 * Database client factory.
 *
 * PLACEHOLDER MODE: no connection is made until `DATABASE_URL` is set (which the
 * Vercel–Neon integration injects automatically once provisioned). The Neon
 * driver is added and wired in the data-layer milestone; until then `getDb()`
 * fails loudly rather than silently returning fake data.
 *
 * When wired, this returns a Drizzle client bound to a per-request, RLS-authed
 * Neon connection (Clerk JWT → Neon Authorize), per docs/SYSTEM_ARCHITECTURE.md.
 */

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };

export function getDb(): never {
  throw new Error(
    dbConfigured()
      ? "DATABASE_URL is set but the Neon/Drizzle driver is not wired yet (data-layer milestone)."
      : "No DATABASE_URL. Provision Neon via the Vercel–Neon integration, then wire the driver.",
  );
}
