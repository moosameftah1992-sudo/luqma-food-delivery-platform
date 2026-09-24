import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Prefer NEON_DATABASE_URL when present so the Neon connection survives
// platform bootstraps that regenerate .env with a local DATABASE_URL.
// drizzle.config.json is the source of truth for `drizzle-kit push`.
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
