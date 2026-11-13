ALTER TABLE "clients" ADD COLUMN "self_shoot" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "style" text DEFAULT 'crew' NOT NULL;--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "shots_done" jsonb DEFAULT '[]'::jsonb NOT NULL;