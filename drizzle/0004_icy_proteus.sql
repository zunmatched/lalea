CREATE TYPE "public"."audio_review_status" AS ENUM('pending_generation', 'needs_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "audio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_unit_id" uuid,
	"exercise_id" uuid,
	"language_id" uuid NOT NULL,
	"text" text NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"generation_method" text DEFAULT 'local_tts' NOT NULL,
	"voice" text,
	"speaking_rate" text DEFAULT '1.0' NOT NULL,
	"duration_ms" integer,
	"checksum" text,
	"storage_path" text,
	"review_status" "audio_review_status" DEFAULT 'pending_generation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_play_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_event_id" uuid NOT NULL,
	"user_learning_path_id" uuid NOT NULL,
	"audio_asset_id" uuid,
	"exercise_id" uuid,
	"event_type" text NOT NULL,
	"playback_rate" text DEFAULT '1.0' NOT NULL,
	"position_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_learning_unit_id_learning_units_id_fk" FOREIGN KEY ("learning_unit_id") REFERENCES "public"."learning_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_play_events" ADD CONSTRAINT "audio_play_events_user_learning_path_id_user_learning_paths_id_fk" FOREIGN KEY ("user_learning_path_id") REFERENCES "public"."user_learning_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_play_events" ADD CONSTRAINT "audio_play_events_audio_asset_id_audio_assets_id_fk" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_play_events" ADD CONSTRAINT "audio_play_events_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audio_exercise_version_unique" ON "audio_assets" USING btree ("exercise_id","content_version");--> statement-breakpoint
CREATE UNIQUE INDEX "audio_play_client_event_unique" ON "audio_play_events" USING btree ("client_event_id");--> statement-breakpoint
CREATE INDEX "audio_play_user_created_idx" ON "audio_play_events" USING btree ("user_learning_path_id","created_at");