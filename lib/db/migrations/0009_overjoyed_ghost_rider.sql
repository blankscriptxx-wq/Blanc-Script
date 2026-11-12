CREATE TYPE "public"."media_kind" AS ENUM('video', 'image', 'document', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'uploaded', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"uploader_user_id" uuid,
	"kind" "media_kind" DEFAULT 'other' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"storage_provider" text DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"duration_seconds" integer,
	"width" integer,
	"height" integer,
	"shoot_id" uuid,
	"project_id" uuid,
	"client_id" uuid,
	"deliverable_id" uuid,
	"content_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "hashtags" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "shoot_id" uuid;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "reviewer_user_id" uuid;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "review_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_rate_pct" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "terms" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "address_text" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "billing_email" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "default_currency" text DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
ALTER TABLE "review_comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "review_comments" ADD COLUMN "timecode_seconds" integer;--> statement-breakpoint
ALTER TABLE "review_comments" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
