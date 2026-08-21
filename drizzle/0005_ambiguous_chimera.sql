ALTER TABLE "audio_assets" ADD COLUMN "engine_version" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "model_id" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "model_checksum" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "provenance" jsonb DEFAULT '{}'::jsonb NOT NULL;