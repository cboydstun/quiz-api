CREATE TYPE "public"."role" AS ENUM('USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" text NOT NULL,
	"question_text" text NOT NULL,
	"answers" text[] NOT NULL,
	"correct_answer" text NOT NULL,
	"hint" text,
	"points" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"legacy_mongo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "user_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"password" text,
	"google_id" text,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"questions_answered" integer DEFAULT 0 NOT NULL,
	"questions_correct" integer DEFAULT 0 NOT NULL,
	"questions_incorrect" integer DEFAULT 0 NOT NULL,
	"lifetime_points" integer DEFAULT 0 NOT NULL,
	"yearly_points" integer DEFAULT 0 NOT NULL,
	"monthly_points" integer DEFAULT 0 NOT NULL,
	"daily_points" integer DEFAULT 0 NOT NULL,
	"consecutive_login_days" integer DEFAULT 0 NOT NULL,
	"last_login_date" timestamp with time zone,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"legacy_mongo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_responses" ADD CONSTRAINT "user_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_responses" ADD CONSTRAINT "user_responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_created_by_idx" ON "questions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "user_responses_user_idx" ON "user_responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_leaderboard_idx" ON "users" USING btree ("score" DESC NULLS LAST,"username");