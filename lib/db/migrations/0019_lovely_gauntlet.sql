ALTER TYPE "public"."deliverable_status" ADD VALUE 'to_film' BEFORE 'editing';--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "shoot_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scripts" ADD CONSTRAINT "scripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scripts" ADD CONSTRAINT "scripts_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
