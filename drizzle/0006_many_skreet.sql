ALTER TABLE "audio_assets" ADD COLUMN "translation" text;--> statement-breakpoint
ALTER TABLE "user_learning_paths" ADD COLUMN "new_vocab_limit" integer DEFAULT 5 NOT NULL;