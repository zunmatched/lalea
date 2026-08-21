ALTER TABLE "review_events" ADD COLUMN "client_event_id" uuid NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "review_client_event_unique" ON "review_events" USING btree ("client_event_id");