CREATE TABLE IF NOT EXISTS "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"token" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"content" jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"accepted_by_name" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "client_onboardings" ADD COLUMN "payment_method" text DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
