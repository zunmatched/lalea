CREATE TABLE "vocab_quiz_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_learning_path_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"source_label" text NOT NULL,
	"category" text NOT NULL,
	"correct_count" integer NOT NULL,
	"total_count" integer NOT NULL,
	"wrong_forms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocab_quiz_sessions" ADD CONSTRAINT "vocab_quiz_sessions_user_learning_path_id_user_learning_paths_id_fk" FOREIGN KEY ("user_learning_path_id") REFERENCES "public"."user_learning_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vocab_quiz_sessions_user_created_idx" ON "vocab_quiz_sessions" USING btree ("user_learning_path_id","created_at");