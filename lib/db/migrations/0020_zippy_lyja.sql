ALTER TABLE "projects" ADD COLUMN "period" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_client_period_uq" ON "projects" ("client_id", "period") WHERE "period" IS NOT NULL;
