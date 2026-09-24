/**
 * Create or reset the Luqma admin account.
 *
 * Run this explicitly (it is NEVER invoked from the request path) whenever the
 * admin password needs to be set. It uses the exact same hashing scheme as
 * src/lib/auth.ts hashPassword(), so no security bypass is involved.
 *
 * Usage:
 *   ADMIN_PASSWORD='Admin@123' node scripts/ensure-admin.mjs
 *   ADMIN_EMAIL='someone@luqma.bh' ADMIN_PASSWORD='...' node scripts/ensure-admin.mjs
 *
 * Requires DATABASE_URL (or NEON_DATABASE_URL) in the environment or .env.
 */
import "dotenv/config";
import crypto from "node:crypto";
import pg from "pg";

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error(
    "ERROR: DATABASE_URL (or NEON_DATABASE_URL) must be set, e.g.\n" +
      '  DATABASE_URL="postgresql://...?sslmode=require" node scripts/ensure-admin.mjs',
  );
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL || "admin@luqma.bh")
  .toLowerCase()
  .trim();
const password = process.env.ADMIN_PASSWORD || process.argv[2];

if (!password) {
  console.error(
    "ERROR: provide a password via ADMIN_PASSWORD env var or as the first argument.\n" +
      "  ADMIN_PASSWORD='Admin@123' node scripts/ensure-admin.mjs",
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("ERROR: password must be at least 8 characters.");
  process.exit(1);
}

/** Must stay byte-for-byte compatible with src/lib/auth.ts hashPassword(). */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Mirror of src/lib/auth.ts verifyPassword(), used to self-check the write. */
function verifyPassword(plain, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(plain, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidate, "hex"),
      Buffer.from(hash, "hex"),
    );
  } catch {
    return false;
  }
}

const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 20000 });

try {
  const host = new URL(url).host;
  console.log(`database : ${host}`);

  // A shell/platform env var silently wins over .env here, because dotenv never
  // overrides existing variables. Surface the difference so the operator can see
  // which database is actually being targeted.
  try {
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync(".env", "utf8");
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
    if (m) {
      const fromFile = m[1].trim().replace(/^["']|["']$/g, "");
      if (fromFile && fromFile !== url) {
        console.warn(
          `warning : shell DATABASE_URL overrides .env -> using ${host}, not ${new URL(fromFile).host}`,
        );
        console.warn(
          "          export DATABASE_URL=... explicitly to target a different database.",
        );
      }
    }
  } catch {
    /* no .env file present, nothing to compare against */
  }

  const existing = await pool.query(
    "select id, email, role, status from users where email = $1",
    [email],
  );

  const passwordHash = hashPassword(password);

  if (existing.rows.length > 0) {
    await pool.query(
      `update users
          set password_hash = $1,
              role = 'admin',
              status = 'active',
              email_verified = true
        where email = $2`,
      [passwordHash, email],
    );
    console.log(`updated  : existing admin ${email} (id=${existing.rows[0].id})`);
  } else {
    const inserted = await pool.query(
      `insert into users (email, full_name, password_hash, role, status, email_verified, phone)
       values ($1, $2, $3, 'admin', 'active', true, $4)
       returning id`,
      [email, "مدير لقمة العام", passwordHash, "+97336000000"],
    );
    console.log(`created  : new admin ${email} (id=${inserted.rows[0].id})`);
  }

  // Self-check: re-read from the database and verify the password round-trips.
  const check = await pool.query(
    "select password_hash from users where email = $1",
    [email],
  );
  const ok = verifyPassword(password, check.rows[0].password_hash);
  console.log(`verify   : ${ok ? "PASS ✓ (password hashes and verifies correctly)" : "FAIL ✗"}`);

  if (!ok) process.exit(1);
  console.log(`\nAdmin login is now: ${email}`);
} catch (err) {
  console.error("ERROR:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
