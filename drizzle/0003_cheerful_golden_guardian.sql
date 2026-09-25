CREATE TABLE "unit_responsible_persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization" text NOT NULL,
	"responsible_person" text NOT NULL,
	"responsible_phone" text DEFAULT '-' NOT NULL,
	"note" text DEFAULT '-' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_responsible_persons_organization_unique" UNIQUE("organization")
);
--> statement-breakpoint
CREATE INDEX "idx_unit_responsible_persons_organization" ON "unit_responsible_persons" USING btree ("organization");