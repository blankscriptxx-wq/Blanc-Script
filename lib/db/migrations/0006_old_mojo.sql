CREATE TYPE "public"."cost_owner" AS ENUM('client', 'agency');--> statement-breakpoint
ALTER TABLE "shoot_talent" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "shoot_talent" ADD COLUMN "cost_owner" "cost_owner" DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE "talent" ADD COLUMN "bank_account_name" text;--> statement-breakpoint
ALTER TABLE "talent" ADD COLUMN "bank_sort_code" text;--> statement-breakpoint
ALTER TABLE "talent" ADD COLUMN "bank_account_number" text;