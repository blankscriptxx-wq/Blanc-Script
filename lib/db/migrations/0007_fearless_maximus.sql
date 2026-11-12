CREATE TYPE "public"."rate_mode" AS ENUM('hourly', 'day');--> statement-breakpoint
ALTER TABLE "shoot_talent" ADD COLUMN "rate_mode" "rate_mode" DEFAULT 'hourly' NOT NULL;