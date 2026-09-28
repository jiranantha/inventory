CREATE TABLE "unit_responsible_update_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_name" text NOT NULL,
	"old_responsible_person" text DEFAULT '-' NOT NULL,
	"old_phone_number" text DEFAULT '-' NOT NULL,
	"new_responsible_person" text NOT NULL,
	"new_phone_number" text DEFAULT '-' NOT NULL,
	"affected_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_asset_count" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '-' NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rolled_back" boolean DEFAULT false NOT NULL,
	"rolled_back_at" timestamp with time zone,
	"rolled_back_by" text
);
--> statement-breakpoint
CREATE INDEX "idx_unit_responsible_update_history_unit_name" ON "unit_responsible_update_history" USING btree ("unit_name");