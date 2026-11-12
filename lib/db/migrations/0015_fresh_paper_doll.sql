CREATE TABLE IF NOT EXISTS "client_onboardings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"billing_type" text DEFAULT 'subscription' NOT NULL,
	"service_plan_id" uuid,
	"monthly_pence" integer,
	"project_title" text,
	"extras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deliverables" text,
	"template_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"welcome_note" text,
	"portal_link_id" uuid,
	"invoice_id" uuid,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
