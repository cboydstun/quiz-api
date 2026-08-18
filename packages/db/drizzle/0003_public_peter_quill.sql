CREATE TABLE "trail_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trail_date" date NOT NULL,
	"legs_reached" integer NOT NULL,
	"completed" boolean NOT NULL,
	"battery_left" integer NOT NULL,
	"airframe_left" integer NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trail_runs_user_date_key" UNIQUE("user_id","trail_date")
);
--> statement-breakpoint
ALTER TABLE "trail_runs" ADD CONSTRAINT "trail_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trail_runs_date_idx" ON "trail_runs" USING btree ("trail_date");