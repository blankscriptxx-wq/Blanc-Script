CREATE TABLE IF NOT EXISTS "client_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"template_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"accepted_by_name" text,
	"accepted_by_link_id" uuid,
	"accepted_ip" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"body" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"related_type" text,
	"related_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "subscription_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "stripe_invoice_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "document_url" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "portal_link_id" uuid;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "portal_links" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "portal_links" ADD COLUMN "requires_login" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_links" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "service_plans" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "service_plans" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "service_plans" ADD COLUMN "stripe_price_amount_pence" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id");