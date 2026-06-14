import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load local env first so `npm run db:*` works without exporting vars manually.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need a direct/session connection (Supabase: port 5432), not the
    // transaction pooler. Falls back to DATABASE_URL for local/single-URL setups.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
