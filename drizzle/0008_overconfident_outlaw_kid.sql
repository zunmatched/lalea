DROP INDEX "vocabulary_due_idx";--> statement-breakpoint
ALTER TABLE "vocabulary_mastery_states" ALTER COLUMN "scheduler_version" SET DEFAULT 'day-bucket-v1';--> statement-breakpoint
ALTER TABLE "vocabulary_mastery_states" DROP COLUMN "interval_days";--> statement-breakpoint
ALTER TABLE "vocabulary_mastery_states" DROP COLUMN "next_review_at";