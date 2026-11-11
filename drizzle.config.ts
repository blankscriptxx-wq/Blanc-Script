import type { Config } from "drizzle-kit";

/** Migrations run in the data-layer milestone once DATABASE_URL (Neon) is set. */
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
} satisfies Config;
