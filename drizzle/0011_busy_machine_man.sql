CREATE TABLE "vocab_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vocab_group_members" ADD CONSTRAINT "vocab_group_members_group_id_vocab_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."vocab_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_group_member_source_unique" ON "vocab_group_members" USING btree ("source_key");