ALTER TABLE "questions" ADD COLUMN "explanation" text;--> statement-breakpoint
CREATE INDEX "user_responses_question_idx" ON "user_responses" USING btree ("question_id");