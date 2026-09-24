import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await guard(["customer", "store", "driver", "admin"]);
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.id))
      .limit(30);
    const unread = rows.filter((r) => !r.isRead).length;
    return Response.json({ notifications: rows, unread });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await guard(["customer", "store", "driver", "admin"]);
    const body = await req.json().catch(() => ({}));
    if (body.id) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, Number(body.id)), eq(notifications.userId, user.id)));
    } else {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, user.id));
    }
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
