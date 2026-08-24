CREATE TABLE "lexeme_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lexeme_id" uuid NOT NULL,
	"form" text NOT NULL,
	"normalized_form" text NOT NULL,
	"part_of_speech" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lexeme_forms" ADD CONSTRAINT "lexeme_forms_lexeme_id_lexemes_id_fk" FOREIGN KEY ("lexeme_id") REFERENCES "public"."lexemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lexeme_form_lookup_idx" ON "lexeme_forms" USING btree ("normalized_form");--> statement-breakpoint
CREATE UNIQUE INDEX "lexeme_form_unique" ON "lexeme_forms" USING btree ("lexeme_id","normalized_form");