ALTER TABLE "client_threads" ADD COLUMN "shoot_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_threads" ADD CONSTRAINT "client_threads_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
