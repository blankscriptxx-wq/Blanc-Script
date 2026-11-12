CREATE TABLE IF NOT EXISTS "portal_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"label" text NOT NULL,
	"token" text NOT NULL,
	"created_by_user_id" uuid,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "auto_research" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "stripe_payment_link_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "stripe_link_amount_pence" integer;--> statement-breakpoint
ALTER TABLE "review_comments" ADD COLUMN "portal_link_id" uuid;--> statement-breakpoint
ALTER TABLE "review_comments" ADD COLUMN "author_name" text;--> statement-breakpoint
ALTER TABLE "wa_conversations" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "wa_messages" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "wa_messages" ADD COLUMN "delivery_status" text;--> statement-breakpoint
ALTER TABLE "wa_messages" ADD COLUMN "delivery_error" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_links" ADD CONSTRAINT "portal_links_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_links" ADD CONSTRAINT "portal_links_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
