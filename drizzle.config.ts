import { defineConfig } from "drizzle-kit";

/**
 * Credentials are read from the environment so that no secrets are committed.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://...?sslmode=require"
 *   npx drizzle-kit push
 *
 * Schema changes are intentionally NOT applied from application runtime code —
 * see src/lib/seed.ts (ensureSeeded) which is disabled in production.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is required to run drizzle-kit. Export it before running, e.g.\n" +
      '  export DATABASE_URL="postgresql://...?sslmode=require"',
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
});
