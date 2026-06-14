CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_name" text DEFAULT '' NOT NULL,
	"action_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"target_table" text DEFAULT 'assets' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"old_value" text DEFAULT '' NOT NULL,
	"new_value" text DEFAULT '' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" integer NOT NULL,
	"asset_code" text DEFAULT '' NOT NULL,
	"inspection_year" integer NOT NULL,
	"inspection_date" text DEFAULT '' NOT NULL,
	"found_location" text DEFAULT '' NOT NULL,
	"inspector_name" text DEFAULT '' NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"evidence_file_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annual_inspections_asset_year_unique" UNIQUE("asset_id","inspection_year")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_code" text NOT NULL,
	"asset_number" text DEFAULT '-' NOT NULL,
	"asset_name" text NOT NULL,
	"asset_description" text DEFAULT '-' NOT NULL,
	"organization" text NOT NULL,
	"organization_type" text DEFAULT 'อื่น ๆ' NOT NULL,
	"asset_type" text DEFAULT 'ครุภัณฑ์และอุปกรณ์อื่น ๆ' NOT NULL,
	"fiscal_year" integer,
	"budget_source" text DEFAULT '' NOT NULL,
	"record_date" text DEFAULT '-' NOT NULL,
	"location" text DEFAULT '-' NOT NULL,
	"building" text DEFAULT '-' NOT NULL,
	"room" text DEFAULT '-' NOT NULL,
	"responsible_person" text DEFAULT '-' NOT NULL,
	"purchase_project" text DEFAULT '-' NOT NULL,
	"purchase_month" text DEFAULT '-' NOT NULL,
	"number_placement" text DEFAULT '-' NOT NULL,
	"quantity" text DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'รายการ' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"responsible_phone" text DEFAULT '-' NOT NULL,
	"status" text DEFAULT 'รอตรวจสอบ' NOT NULL,
	"latest_inspection_date" text DEFAULT '' NOT NULL,
	"inspection_result" text DEFAULT '' NOT NULL,
	"is_inspected" boolean DEFAULT false NOT NULL,
	"image_count" integer DEFAULT 0 NOT NULL,
	"asset_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '-' NOT NULL,
	"asset_structure_type" text DEFAULT 'single' NOT NULL,
	"asset_set_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	CONSTRAINT "assets_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "master_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "master_data_category_name_unique" UNIQUE("category","name")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'อื่น ๆ' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "organizations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"permissions" jsonb NOT NULL,
	"allow_export" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"protected" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" text,
	"organization" text DEFAULT '-' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"viewer_can_export" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_inspections" ADD CONSTRAINT "annual_inspections_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_annual_inspections_asset_id" ON "annual_inspections" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_annual_inspections_year" ON "annual_inspections" USING btree ("inspection_year");--> statement-breakpoint
CREATE INDEX "idx_assets_organization" ON "assets" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "idx_assets_status" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assets_fiscal_year" ON "assets" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "idx_assets_asset_type" ON "assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "idx_assets_deleted_at" ON "assets" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_master_data_category" ON "master_data" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_organizations_active" ON "organizations" USING btree ("active");