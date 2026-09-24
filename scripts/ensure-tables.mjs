/**
 * Ensure the full Luqma schema exists (idempotent, non-destructive).
 *
 * Why this exists: if `drizzle-kit push` ever fails part way through (for
 * example the `relation "areas" already exists` error caused by concurrent
 * pushes), the database is left with a PARTIAL schema. The app then throws a
 * query error at runtime and every login returns HTTP 500.
 *
 * This script completes any partial schema. Every statement uses
 * `CREATE ... IF NOT EXISTS`, so it is safe to re-run and never drops or
 * truncates existing data.
 *
 * Usage:
 *   DATABASE_URL="postgresql://...?sslmode=require" node scripts/ensure-tables.mjs
 *
 * Prefer `npx drizzle-kit push` for normal schema changes; use this only to
 * repair/create a database that is missing tables.
 */
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error(
    "ERROR: DATABASE_URL (or NEON_DATABASE_URL) must be set:\n" +
      '  DATABASE_URL="postgresql://...?sslmode=require" node scripts/ensure-tables.mjs',
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */
const ENUMS = [
  ["user_role", "'customer','store','driver','admin'"],
  ["account_status", "'pending','active','suspended','rejected','banned'"],
  ["store_status", "'open','busy','closed'"],
  [
    "order_status",
    "'pending','accepted','preparing','ready','assigned','picked_up','on_the_way','delivered','cancelled'",
  ],
  ["payment_method", "'card','benefitpay'"],
  ["request_status", "'pending','approved','rejected'"],
];

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
     id serial PRIMARY KEY,
     email text NOT NULL,
     phone text,
     password_hash text NOT NULL,
     full_name text NOT NULL,
     role user_role NOT NULL DEFAULT 'customer',
     status account_status NOT NULL DEFAULT 'active',
     email_verified boolean NOT NULL DEFAULT false,
     verify_token text,
     governorate_id integer,
     area_id integer,
     address text,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS sessions (
     token text PRIMARY KEY,
     user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at timestamptz NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS governorates (
     id serial PRIMARY KEY,
     name_ar text NOT NULL,
     sort_order integer NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS areas (
     id serial PRIMARY KEY,
     governorate_id integer NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
     name_ar text NOT NULL,
     delivery_fee numeric(8,3) NOT NULL DEFAULT '0.800'
   )`,

  `CREATE TABLE IF NOT EXISTS restaurants (
     id serial PRIMARY KEY,
     owner_user_id integer REFERENCES users(id) ON DELETE SET NULL,
     name_ar text NOT NULL,
     cuisine text NOT NULL DEFAULT 'عام',
     description text NOT NULL DEFAULT '',
     image_url text,
     emoji text NOT NULL DEFAULT '🍽️',
     governorate_id integer,
     area_id integer,
     address text NOT NULL DEFAULT '',
     phone text NOT NULL DEFAULT '',
     status store_status NOT NULL DEFAULT 'open',
     is_active boolean NOT NULL DEFAULT true,
     rating numeric(3,2) NOT NULL DEFAULT '4.50',
     rating_count integer NOT NULL DEFAULT 0,
     min_order numeric(8,3) NOT NULL DEFAULT '2.000',
     delivery_fee numeric(8,3) NOT NULL DEFAULT '0.800',
     prep_minutes integer NOT NULL DEFAULT 25,
     commission_per_order numeric(8,3) NOT NULL DEFAULT '0.500',
     discount_percent integer NOT NULL DEFAULT 0,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS categories (
     id serial PRIMARY KEY,
     restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     name_ar text NOT NULL,
     sort_order integer NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS menu_items (
     id serial PRIMARY KEY,
     restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     category_id integer REFERENCES categories(id) ON DELETE SET NULL,
     name_ar text NOT NULL,
     description text NOT NULL DEFAULT '',
     emoji text NOT NULL DEFAULT '🍴',
     image_url text,
     price numeric(8,3) NOT NULL DEFAULT '0',
     pending_price numeric(8,3),
     is_available boolean NOT NULL DEFAULT true,
     calories integer,
     discount_percent integer NOT NULL DEFAULT 0,
     sort_order integer NOT NULL DEFAULT 0,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS item_sizes (
     id serial PRIMARY KEY,
     item_id integer NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
     name_ar text NOT NULL,
     price numeric(8,3) NOT NULL DEFAULT '0',
     sort_order integer NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS addon_groups (
     id serial PRIMARY KEY,
     item_id integer NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
     name_ar text NOT NULL,
     selection_type text NOT NULL DEFAULT 'multi',
     required boolean NOT NULL DEFAULT false
   )`,

  `CREATE TABLE IF NOT EXISTS addons (
     id serial PRIMARY KEY,
     group_id integer NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
     name_ar text NOT NULL,
     price numeric(8,3) NOT NULL DEFAULT '0',
     is_available boolean NOT NULL DEFAULT true
   )`,

  `CREATE TABLE IF NOT EXISTS orders (
     id serial PRIMARY KEY,
     code text NOT NULL,
     customer_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     driver_id integer REFERENCES users(id) ON DELETE SET NULL,
     status order_status NOT NULL DEFAULT 'pending',
     payment_method payment_method NOT NULL DEFAULT 'card',
     payment_status text NOT NULL DEFAULT 'paid',
     subtotal numeric(10,3) NOT NULL DEFAULT '0',
     discount_amount numeric(10,3) NOT NULL DEFAULT '0',
     delivery_fee numeric(8,3) NOT NULL DEFAULT '0',
     total numeric(10,3) NOT NULL DEFAULT '0',
     store_commission numeric(8,3) NOT NULL DEFAULT '0.500',
     driver_commission numeric(8,3) NOT NULL DEFAULT '0',
     driver_commission_rate numeric(5,2) NOT NULL DEFAULT '10',
     governorate_id integer,
     area_id integer,
     address_text text NOT NULL DEFAULT '',
     notes text NOT NULL DEFAULT '',
     cancel_reason text,
     cancelled_by text,
     rating integer,
     placed_at timestamptz NOT NULL DEFAULT now(),
     accepted_at timestamptz,
     ready_at timestamptz,
     assigned_at timestamptz,
     delivered_at timestamptz,
     cancelled_at timestamptz
   )`,

  `CREATE TABLE IF NOT EXISTS order_items (
     id serial PRIMARY KEY,
     order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     item_id integer,
     name_ar text NOT NULL,
     size_name text,
     unit_price numeric(8,3) NOT NULL DEFAULT '0',
     quantity integer NOT NULL DEFAULT 1,
     addons_total numeric(8,3) NOT NULL DEFAULT '0',
     line_total numeric(10,3) NOT NULL DEFAULT '0',
     notes text NOT NULL DEFAULT ''
   )`,

  `CREATE TABLE IF NOT EXISTS order_item_addons (
     id serial PRIMARY KEY,
     order_item_id integer NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
     name_ar text NOT NULL,
     price numeric(8,3) NOT NULL DEFAULT '0'
   )`,

  `CREATE TABLE IF NOT EXISTS reviews (
     id serial PRIMARY KEY,
     order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     customer_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     rating integer NOT NULL,
     comment text NOT NULL DEFAULT '',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS price_requests (
     id serial PRIMARY KEY,
     restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     item_id integer NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
     item_name text NOT NULL,
     old_price numeric(8,3) NOT NULL,
     new_price numeric(8,3) NOT NULL,
     reason text NOT NULL DEFAULT '',
     status request_status NOT NULL DEFAULT 'pending',
     reviewed_note text,
     created_at timestamptz NOT NULL DEFAULT now(),
     reviewed_at timestamptz
   )`,

  `CREATE TABLE IF NOT EXISTS discounts (
     id serial PRIMARY KEY,
     restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     item_id integer,
     title text NOT NULL,
     percent integer NOT NULL DEFAULT 10,
     is_active boolean NOT NULL DEFAULT true,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS driver_profiles (
     id serial PRIMARY KEY,
     user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     national_id text NOT NULL DEFAULT '',
     license_number text NOT NULL DEFAULT '',
     vehicle_type text NOT NULL DEFAULT 'دراجة نارية',
     vehicle_plate text NOT NULL DEFAULT '',
     id_card_url text NOT NULL DEFAULT '',
     license_url text NOT NULL DEFAULT '',
     terms_accepted boolean NOT NULL DEFAULT false,
     status account_status NOT NULL DEFAULT 'pending',
     is_online boolean NOT NULL DEFAULT false,
     commission_rate numeric(5,2) NOT NULL DEFAULT '10',
     balance_due numeric(10,3) NOT NULL DEFAULT '0',
     balance_paid numeric(10,3) NOT NULL DEFAULT '0',
     completed_orders integer NOT NULL DEFAULT 0,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS driver_ledger (
     id serial PRIMARY KEY,
     driver_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     order_id integer,
     type text NOT NULL DEFAULT 'earning',
     amount numeric(10,3) NOT NULL DEFAULT '0',
     note text NOT NULL DEFAULT '',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS notifications (
     id serial PRIMARY KEY,
     user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title text NOT NULL,
     body text NOT NULL DEFAULT '',
     kind text NOT NULL DEFAULT 'info',
     order_id integer,
     is_read boolean NOT NULL DEFAULT false,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS app_settings (
     key text PRIMARY KEY,
     value text NOT NULL DEFAULT ''
   )`,
];

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */
const INDEXES = [
  "CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)",
  "CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)",
  "CREATE INDEX IF NOT EXISTS areas_gov_idx ON areas (governorate_id)",
  "CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON menu_items (restaurant_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS orders_code_unique ON orders (code)",
  "CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id)",
  "CREATE INDEX IF NOT EXISTS orders_restaurant_idx ON orders (restaurant_id)",
  "CREATE INDEX IF NOT EXISTS orders_driver_idx ON orders (driver_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS driver_profiles_user_unique ON driver_profiles (user_id)",
  "CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id)",
];

const EXPECTED = [
  "users", "sessions", "governorates", "areas", "restaurants", "categories",
  "menu_items", "item_sizes", "addon_groups", "addons", "orders",
  "order_items", "order_item_addons", "reviews", "price_requests",
  "discounts", "driver_profiles", "driver_ledger", "notifications",
  "app_settings",
];

const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 20000 });

try {
  console.log(`database : ${new URL(url).host}`);

  // Warn when a shell env var silently overrides .env (dotenv never overrides).
  try {
    const { readFileSync } = await import("node:fs");
    const m = readFileSync(".env", "utf8").match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
    if (m) {
      const fromFile = m[1].trim().replace(/^["']|["']$/g, "");
      if (fromFile && fromFile !== url) {
        console.warn(`warning : shell DATABASE_URL overrides .env (.env points at ${new URL(fromFile).host})`);
      }
    }
  } catch {
    /* no .env, nothing to compare */
  }

  for (const [name, values] of ENUMS) {
    await pool.query(`DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    console.log(`  type    ${name}`);
  }

  for (const ddl of TABLES) {
    await pool.query(ddl);
  }
  console.log(`  tables  ${TABLES.length} ensured (CREATE TABLE IF NOT EXISTS)`);

  for (const idx of INDEXES) {
    await pool.query(idx);
  }
  console.log(`  indexes ${INDEXES.length} ensured`);

  // Report the final state.
  const have = (await pool.query(
    "select table_name from information_schema.tables where table_schema='public'",
  )).rows.map((r) => r.table_name);
  const missing = EXPECTED.filter((t) => !have.includes(t));
  console.log(`\ntables present : ${have.length}`);
  console.log(`missing        : ${missing.length ? missing.join(", ") : "none ✓"}`);

  const adminCount = (await pool.query(
    "select count(*)::int n from users where email = 'admin@luqma.bh'",
  )).rows[0].n;
  console.log(`admin account  : ${adminCount > 0 ? "exists ✓" : "MISSING"}`);
  if (adminCount === 0) {
    console.log(
      "\nNext step - create the admin (tables now exist):\n" +
        "  DATABASE_URL=... ADMIN_PASSWORD='Admin@123' node scripts/ensure-admin.mjs",
    );
  }

  if (missing.length) process.exitCode = 1;
  else console.log("\nSchema OK - login should now work.");
} catch (err) {
  console.error("ERROR:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
