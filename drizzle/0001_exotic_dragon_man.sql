CREATE TYPE "public"."injection_status" AS ENUM('captured', 'needs_enrichment', 'needs_review', 'approved', 'ready_to_learn', 'merged', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."vocabulary_status" AS ENUM('ready_to_learn', 'learning', 'learned', 'ignored');--> statement-breakpoint
CREATE TABLE "lesson_vocabulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_unit_id" uuid NOT NULL,
	"lexeme_sense_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lexeme_senses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lexeme_id" uuid NOT NULL,
	"part_of_speech" text,
	"definition_language_id" uuid NOT NULL,
	"definition" text NOT NULL,
	"register" text DEFAULT 'neutral' NOT NULL,
	"domain" text DEFAULT 'general_business' NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lexemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language_id" uuid NOT NULL,
	"canonical_form" text NOT NULL,
	"normalized_form" text NOT NULL,
	"type" text DEFAULT 'phrase' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vocabulary_mastery_state_id" uuid NOT NULL,
	"exercise_attempt_id" uuid,
	"is_correct" boolean NOT NULL,
	"rating" text,
	"before_state" jsonb NOT NULL,
	"after_state" jsonb NOT NULL,
	"reason" text NOT NULL,
	"scheduler_version" text DEFAULT 'mvp-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sense_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lexeme_sense_id" uuid NOT NULL,
	"language_id" uuid NOT NULL,
	"translation" text NOT NULL,
	"usage_note" text,
	"status" text DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_vocabulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_learning_path_id" uuid NOT NULL,
	"lexeme_sense_id" uuid NOT NULL,
	"status" "vocabulary_status" DEFAULT 'ready_to_learn' NOT NULL,
	"first_learned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_vocabulary_id" uuid,
	"injection_task_id" uuid,
	"original_sentence" text,
	"note" text,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"contains_sensitive_content" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lexeme_sense_id" uuid NOT NULL,
	"text_language_id" uuid NOT NULL,
	"text" text NOT NULL,
	"translation_language_id" uuid,
	"translation" text,
	"context" text,
	"register" text DEFAULT 'neutral' NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_injection_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_learning_path_id" uuid NOT NULL,
	"language_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"status" "injection_status" DEFAULT 'captured' NOT NULL,
	"matched_lexeme_sense_id" uuid,
	"ai_schema_version" integer,
	"ai_draft" jsonb,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_mastery_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_vocabulary_id" uuid NOT NULL,
	"dimension" "mastery_dimension" NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"review_count" integer DEFAULT 0 NOT NULL,
	"scheduler_version" text DEFAULT 'mvp-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_vocabulary" ADD CONSTRAINT "lesson_vocabulary_learning_unit_id_learning_units_id_fk" FOREIGN KEY ("learning_unit_id") REFERENCES "public"."learning_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_vocabulary" ADD CONSTRAINT "lesson_vocabulary_lexeme_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("lexeme_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexeme_senses" ADD CONSTRAINT "lexeme_senses_lexeme_id_lexemes_id_fk" FOREIGN KEY ("lexeme_id") REFERENCES "public"."lexemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexeme_senses" ADD CONSTRAINT "lexeme_senses_definition_language_id_languages_id_fk" FOREIGN KEY ("definition_language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexemes" ADD CONSTRAINT "lexemes_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_vocabulary_mastery_state_id_vocabulary_mastery_states_id_fk" FOREIGN KEY ("vocabulary_mastery_state_id") REFERENCES "public"."vocabulary_mastery_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_exercise_attempt_id_exercise_attempts_id_fk" FOREIGN KEY ("exercise_attempt_id") REFERENCES "public"."exercise_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sense_translations" ADD CONSTRAINT "sense_translations_lexeme_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("lexeme_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sense_translations" ADD CONSTRAINT "sense_translations_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_user_learning_path_id_user_learning_paths_id_fk" FOREIGN KEY ("user_learning_path_id") REFERENCES "public"."user_learning_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_lexeme_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("lexeme_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_contexts" ADD CONSTRAINT "vocabulary_contexts_user_vocabulary_id_user_vocabulary_id_fk" FOREIGN KEY ("user_vocabulary_id") REFERENCES "public"."user_vocabulary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_contexts" ADD CONSTRAINT "vocabulary_contexts_injection_task_id_vocabulary_injection_tasks_id_fk" FOREIGN KEY ("injection_task_id") REFERENCES "public"."vocabulary_injection_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_examples" ADD CONSTRAINT "vocabulary_examples_lexeme_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("lexeme_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_examples" ADD CONSTRAINT "vocabulary_examples_text_language_id_languages_id_fk" FOREIGN KEY ("text_language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_examples" ADD CONSTRAINT "vocabulary_examples_translation_language_id_languages_id_fk" FOREIGN KEY ("translation_language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_injection_tasks" ADD CONSTRAINT "vocabulary_injection_tasks_user_learning_path_id_user_learning_paths_id_fk" FOREIGN KEY ("user_learning_path_id") REFERENCES "public"."user_learning_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_injection_tasks" ADD CONSTRAINT "vocabulary_injection_tasks_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_injection_tasks" ADD CONSTRAINT "vocabulary_injection_tasks_matched_lexeme_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("matched_lexeme_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_mastery_states" ADD CONSTRAINT "vocabulary_mastery_states_user_vocabulary_id_user_vocabulary_id_fk" FOREIGN KEY ("user_vocabulary_id") REFERENCES "public"."user_vocabulary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_vocabulary_unique" ON "lesson_vocabulary" USING btree ("learning_unit_id","lexeme_sense_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lexeme_language_form_unique" ON "lexemes" USING btree ("language_id","normalized_form");--> statement-breakpoint
CREATE UNIQUE INDEX "sense_translation_unique" ON "sense_translations" USING btree ("lexeme_sense_id","language_id","translation");--> statement-breakpoint
CREATE UNIQUE INDEX "user_vocabulary_sense_unique" ON "user_vocabulary" USING btree ("user_learning_path_id","lexeme_sense_id");--> statement-breakpoint
CREATE INDEX "injection_lookup_idx" ON "vocabulary_injection_tasks" USING btree ("user_learning_path_id","normalized_text","status");--> statement-breakpoint
CREATE UNIQUE INDEX "vocabulary_mastery_unique" ON "vocabulary_mastery_states" USING btree ("user_vocabulary_id","dimension");--> statement-breakpoint
CREATE INDEX "vocabulary_due_idx" ON "vocabulary_mastery_states" USING btree ("next_review_at","dimension");