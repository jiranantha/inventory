import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { Permissions } from "@/lib/permissions";
import type { AssetSetItem, EvidenceImage } from "@/types";

// ---------------------------------------------------------------------------
// Auth.js (NextAuth v5) tables — shape required by @auth/drizzle-adapter.
// The users table is EXTENDED with the app's authorization columns so a single
// row carries both the OAuth identity and the role/approval state.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  // --- app authorization columns ---
  role: text("role"), // null until an Admin assigns one
  organization: text("organization").notNull().default("-"),
  active: boolean("active").notNull().default(false), // inactive until approved
  viewerCanExport: boolean("viewer_can_export").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---------------------------------------------------------------------------
// Authorization: role definitions (single source of truth shared with the UI).
// ---------------------------------------------------------------------------

export const roles = pgTable("roles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  permissions: jsonb("permissions").$type<Permissions>().notNull(),
  allowExport: boolean("allow_export").notNull().default(false),
  active: boolean("active").notNull().default(true),
  protected: boolean("protected").notNull().default(false),
});

// ---------------------------------------------------------------------------
// Master data. Organizations keep their own richer table; locations and
// equipment types share a category-tagged table.
// ---------------------------------------------------------------------------

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    type: text("type").notNull().default("อื่น ๆ"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("idx_organizations_active").on(t.active)],
);

export const masterData = pgTable(
  "master_data",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(), // 'location' | 'equipment_type'
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("idx_master_data_category").on(t.category),
    unique("master_data_category_name_unique").on(t.category, t.name),
  ],
);

// ---------------------------------------------------------------------------
// Assets. Denormalized text columns mirror the client AssetListRow exactly so
// the cutover is lossless; indexes back the list/report/dashboard queries.
// ---------------------------------------------------------------------------

export const assets = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    assetCode: text("asset_code").notNull().unique(),
    assetNumber: text("asset_number").notNull().default("-"),
    assetName: text("asset_name").notNull(),
    assetDescription: text("asset_description").notNull().default("-"),
    organization: text("organization").notNull(),
    organizationType: text("organization_type").notNull().default("อื่น ๆ"),
    assetType: text("asset_type").notNull().default("ครุภัณฑ์และอุปกรณ์อื่น ๆ"),
    fiscalYear: integer("fiscal_year"),
    budgetSource: text("budget_source").notNull().default(""),
    recordDate: text("record_date").notNull().default("-"),
    location: text("location").notNull().default("-"),
    building: text("building").notNull().default("-"),
    room: text("room").notNull().default("-"),
    responsiblePerson: text("responsible_person").notNull().default("-"),
    purchaseProject: text("purchase_project").notNull().default("-"),
    purchaseMonth: text("purchase_month").notNull().default("-"),
    numberPlacement: text("number_placement").notNull().default("-"),
    quantity: text("quantity").notNull().default("1"),
    unit: text("unit").notNull().default("รายการ"),
    price: text("price").notNull().default(""),
    responsiblePhone: text("responsible_phone").notNull().default("-"),
    status: text("status").notNull().default("รอตรวจสอบ"),
    latestInspectionDate: text("latest_inspection_date").notNull().default(""),
    inspectionResult: text("inspection_result").notNull().default(""),
    isInspected: boolean("is_inspected").notNull().default(false),
    imageCount: integer("image_count").notNull().default(0),
    assetImages: jsonb("asset_images").$type<EvidenceImage[]>().notNull().default(sql`'[]'::jsonb`),
    note: text("note").notNull().default("-"),
    assetStructureType: text("asset_structure_type").notNull().default("single"),
    assetSetItems: jsonb("asset_set_items").$type<AssetSetItem[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
  },
  (t) => [
    index("idx_assets_organization").on(t.organization),
    index("idx_assets_status").on(t.status),
    index("idx_assets_fiscal_year").on(t.fiscalYear),
    index("idx_assets_asset_type").on(t.assetType),
    index("idx_assets_deleted_at").on(t.deletedAt),
  ],
);

// ---------------------------------------------------------------------------
// Annual inspections (one row per asset per fiscal year).
// ---------------------------------------------------------------------------

export const annualInspections = pgTable(
  "annual_inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    assetCode: text("asset_code").notNull().default(""),
    inspectionYear: integer("inspection_year").notNull(),
    inspectionDate: text("inspection_date").notNull().default(""),
    foundLocation: text("found_location").notNull().default(""),
    inspectorName: text("inspector_name").notNull().default(""),
    result: text("result").notNull().default(""),
    evidenceFileNames: jsonb("evidence_file_names").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    evidenceImages: jsonb("evidence_images").$type<EvidenceImage[]>().notNull().default(sql`'[]'::jsonb`),
    note: text("note").notNull().default(""),
    previousStatus: text("previous_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("annual_inspections_asset_year_unique").on(t.assetId, t.inspectionYear),
    index("idx_annual_inspections_asset_id").on(t.assetId),
    index("idx_annual_inspections_year").on(t.inspectionYear),
  ],
);

// ---------------------------------------------------------------------------
// Activity log (audit trail for asset mutations).
// ---------------------------------------------------------------------------

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userName: text("user_name").notNull().default(""),
    actionType: text("action_type").notNull(),
    targetId: integer("target_id").notNull(),
    targetTable: text("target_table").notNull().default("assets"),
    detail: text("detail").notNull().default(""),
    oldValue: text("old_value").notNull().default(""),
    newValue: text("new_value").notNull().default(""),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_activity_logs_created_at").on(t.createdAt)],
);

export type AssetRow = typeof assets.$inferSelect;
export type AssetInsert = typeof assets.$inferInsert;
export type InspectionRow = typeof annualInspections.$inferSelect;
export type ActivityLogRow = typeof activityLogs.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
