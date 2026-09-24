import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const code = String(body.code || "").trim();

    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.verifyToken, code)))
      .limit(1);

    if (!rows[0]) {
      return Response.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ emailVerified: true, verifyToken: null })
      .where(eq(users.id, rows[0].id));

    await createSession(rows[0].id);

    return Response.json({ ok: true, role: rows[0].role });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const res = await POST(
    new Request(req.url, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  );
  return res;
}
