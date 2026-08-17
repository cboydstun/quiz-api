ALTER TABLE "questions" ADD COLUMN "domain" text;--> statement-breakpoint
CREATE INDEX "questions_domain_idx" ON "questions" USING btree ("domain");