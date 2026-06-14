// Seed PostgreSQL with the baseline data: organizations, role definitions,
// master data (locations + equipment types), and the 59 imported assets.
// Idempotent — safe to run repeatedly (uses onConflictDoNothing).
//
//   npm run db:seed
//
// Users are intentionally NOT seeded: they arrive via Google OAuth and are
// auto-promoted to Admin only if their email is in ADMIN_EMAILS.

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { assetTypeOptions, storageLocationOptions } from "@/constants/options";
import { assetToColumns } from "@/db/mappers";
import { assetListRows } from "@/lib/assets";
import { organizations as orgList } from "@/lib/organizations";
import { initialRoleDefinitions } from "@/lib/permissions";

async function main() {
  // Imported after dotenv so DATABASE_URL is available when the db module loads.
  const { db } = await import("@/db");
  const { assets, masterData, organizations, roles } = await import("@/db/schema");

  console.log(`Seeding ${orgList.length} organizations...`);
  if (orgList.length) {
    await db
      .insert(organizations)
      .values(orgList.map((org) => ({ name: org.name, type: org.type, active: true })))
      .onConflictDoNothing();
  }

  console.log(`Seeding ${initialRoleDefinitions.length} roles...`);
  await db
    .insert(roles)
    .values(
      initialRoleDefinitions.map((role) => ({
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        allowExport: role.allowExport,
        active: role.active,
        protected: role.protected ?? false,
      })),
    )
    .onConflictDoNothing();

  console.log(`Seeding ${storageLocationOptions.length} locations + ${assetTypeOptions.length} equipment types...`);
  const masterRows = [
    ...storageLocationOptions.map((name) => ({ category: "location", name, active: true })),
    ...assetTypeOptions.map((name) => ({ category: "equipment_type", name, active: true })),
  ];
  if (masterRows.length) {
    await db.insert(masterData).values(masterRows).onConflictDoNothing();
  }

  console.log(`Seeding ${assetListRows.length} assets...`);
  if (assetListRows.length) {
    await db
      .insert(assets)
      .values(assetListRows.map((asset) => assetToColumns(asset)))
      .onConflictDoNothing();
  }

  console.log("✅ Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
