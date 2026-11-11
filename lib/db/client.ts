import { readFileSync, existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { schema } from "./schema";

/**
 * Database client — Neon Postgres over HTTPS (@neondatabase/serverless), Drizzle.
 * HTTP driver suits Vercel serverless and the agent proxy.
 * Connection from DATABASE_URL (Vercel–Neon integration / .env.local).
 *
 * Dev-sandbox only: when HTTPS_PROXY is set, route the driver's fetch through the
 * agent proxy (Node's global fetch ignores HTTPS_PROXY). This is a no-op on Vercel.
 */
declare global {
  // eslint-disable-next-line no-var
  var __bsNeonProxy: boolean | undefined;
}

if (process.env.HTTPS_PROXY && !globalThis.__bsNeonProxy) {
  try {
    const caPath = "/root/.ccr/ca-bundle.crt";
    const dispatcher = new ProxyAgent({
      uri: process.env.HTTPS_PROXY,
      requestTls: existsSync(caPath) ? { ca: readFileSync(caPath) } : undefined,
    });
    // Use undici's fetch directly (Next patches global fetch and drops `dispatcher`).
    neonConfig.fetchFunction = (url: string, opts: Record<string, unknown>) =>
      undiciFetch(url, { ...opts, dispatcher } as never);
    globalThis.__bsNeonProxy = true;
  } catch {
    // fall back to native fetch
  }
}

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
