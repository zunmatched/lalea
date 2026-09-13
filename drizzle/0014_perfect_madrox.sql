CREATE TABLE "exercise_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_unit_id" uuid NOT NULL,
	"context" text,
	"image_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "exercise_groups" ADD CONSTRAINT "exercise_groups_learning_unit_id_learning_units_id_fk" FOREIGN KEY ("learning_unit_id") REFERENCES "public"."learning_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_group_id_exercise_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."exercise_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_group_id_exercise_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."exercise_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audio_group_version_unique" ON "audio_assets" USING btree ("group_id","content_version");