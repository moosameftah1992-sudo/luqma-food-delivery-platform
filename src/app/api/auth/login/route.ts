import { eq } from "drizzle-orm";
import { db } from "@/db";
import { driverProfiles, users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Generic client-facing message. Never reveal whether an account exists. */
const INVALID_CREDENTIALS = "البريد الإلكتروني أو كلمة المرور غير صحيحة";

/** Shown only when the database itself fails, so a 500 is diagnosable. */
const DB_HINT =
  "تعذّر الاتصال بقاعدة البيانات. تأكد من ضبط DATABASE_URL وأن المخطط مكتمل " +
  "(شغّل: node scripts/ensure-tables.mjs)";

export async function POST(req: Request) {
  let email = "";
  let password = "";
  let role = "customer";

  try {
    const body = await req.json().catch(() => ({}));
    email = String(body.email || "").toLowerCase().trim();
    password = String(body.password || "");
    role = String(body.role || "customer");
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  /* ---------------------------------------------------------------- */
  /* 1. Load the user - a missing table must not become a bare 500    */
  /* ---------------------------------------------------------------- */
  let rows: (typeof users.$inferSelect)[] = [];
  try {
    rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  } catch (err) {
    console.error("[auth] login: users query failed", err);
    return Response.json({ error: DB_HINT }, { status: 500 });
  }

  const user = rows[0];
  const passwordOk = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    // Server-side diagnostics only; the client always gets the same message.
    console.warn(
      `[auth] failed login for ${email} (role=${role}): ${!user ? "no such account" : "bad password"}`,
    );
    return Response.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  if (user.role !== role) {
    return Response.json(
      { error: `هذا الحساب ليس من نوع ${role}` },
      { status: 403 },
    );
  }

  /* ---------------------------------------------------------------- */
  /* 2. Driver accounts need their profile approved                    */
  /* ---------------------------------------------------------------- */
  if (user.role === "driver") {
    let st = "pending";
    try {
      const prof = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, user.id))
        .limit(1);
      st = prof[0]?.status ?? "pending";
    } catch (err) {
      console.error("[auth] login: driverProfiles query failed", err);
      return Response.json({ error: DB_HINT }, { status: 500 });
    }

    if (st === "banned")
      return Response.json(
        { error: "تم إيقاف هذا الحساب من قبل الإدارة" },
        { status: 403 },
      );
    if (st === "pending")
      return Response.json(
        { error: "حسابك قيد المراجعة من قبل الإدارة" },
        { status: 403 },
      );
  }

  if (user.status !== "active") {
    return Response.json({ error: "الحساب غير مفعل" }, { status: 403 });
  }

  /* ---------------------------------------------------------------- */
  /* 3. Create the session - the `sessions` table is a common casualty  */
  /*    of a half-finished drizzle-kit push                            */
  /* ---------------------------------------------------------------- */
  try {
    await createSession(user.id);
  } catch (err) {
    console.error("[auth] login: createSession failed", err);
    return Response.json(
      {
        error:
          "تعذّر إنشاء الجلسة. جدول sessions قد يكون ناقصاً — شغّل: node scripts/ensure-tables.mjs",
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
