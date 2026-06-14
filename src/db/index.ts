import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

// postgres.js connects lazily (on first query), so constructing the client with a
// placeholder when DATABASE_URL is absent lets `next build` introspect the schema
// without a live database. Real queries require DATABASE_URL to be set.
const connectionString = process.env.DATABASE_URL ?? "postgres://localhost:5432/postgres";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set — database queries will fail until it is configured in .env.local.",
  );
}

// Reuse the postgres.js client across hot-reloads in dev so we don't exhaust the
// connection pool. In production a single module instance is created per worker.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

// On Vercel (serverless) each function instance should hold very few connections,
// since many instances run concurrently behind Supabase's pooler. A long-lived
// `next start` server can hold more.
const isServerless = Boolean(process.env.VERCEL);

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: Number(process.env.DB_POOL_MAX ?? (isServerless ? 1 : 10)),
    // Supabase's transaction pooler (port 6543) does not support prepared
    // statements / session state — required for serverless. Harmless otherwise.
    prepare: false,
    // Fail fast if a connection can't be established, instead of letting the
    // serverless function hang up to its 300s max duration.
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 10),
    // On serverless the postgres.js client is reused across invocations, but
    // Supabase's pooler silently reaps idle server-side connections. Reusing a
    // reaped connection makes the next query block on a dead socket until the
    // function times out (the 300s "/api/auth/session" hang). Recycle our own
    // connections first so we always reconnect to a live one.
    idle_timeout: isServerless ? 20 : undefined,
    max_lifetime: isServerless ? 60 * 5 : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
