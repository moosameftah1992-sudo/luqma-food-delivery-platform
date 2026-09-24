import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { driverLedger, driverProfiles, orders, users } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { pushNotification } from "@/lib/notify";
import { num } from "@/lib/utils";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await guard(["admin"]);
    const rows = await db
      .select({
        profile: driverProfiles,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        emailVerified: users.emailVerified,
        userStatus: users.status,
        createdAt: users.createdAt,
      })
      .from(driverProfiles)
      .innerJoin(users, eq(users.id, driverProfiles.userId))
      .orderBy(desc(driverProfiles.id));

    const allOrders = await db.select().from(orders);

    return Response.json({
      drivers: rows.map((r) => {
        const mine = allOrders.filter((o) => o.driverId === r.profile.userId);
        const done = mine.filter((o) => o.status === "delivered");
        return {
          ...r.profile,
          email: r.email,
          fullName: r.fullName,
          phone: r.phone,
          emailVerified: r.emailVerified,
          userStatus: r.userStatus,
          joinedAt: r.createdAt,
          completed: done.length,
          cancelled: mine.filter((o) => o.status === "cancelled").length,
          fees: done.reduce((s, o) => s + num(o.deliveryFee), 0),
        };
      }),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await guard(["admin"]);
    const body = await req.json();
    const driverId = Number(body.driverId);
    const action = String(body.action);

    const prof = (
      await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.id, driverId))
        .limit(1)
    )[0];
    if (!prof) return Response.json({ error: "المندوب غير موجود" }, { status: 404 });

    if (action === "approve") {
      await db
        .update(driverProfiles)
        .set({ status: "active" })
        .where(eq(driverProfiles.id, driverId));
      await db
        .update(users)
        .set({ status: "active" })
        .where(eq(users.id, prof.userId));
      await pushNotification(
        prof.userId,
        "تم تفعيل حسابك 🎉",
        "تمت الموافقة على طلبك، يمكنك الآن استلام الطلبات",
        "success",
      );
      return Response.json({ ok: true });
    }

    if (action === "reject") {
      await db
        .update(driverProfiles)
        .set({ status: "rejected", isOnline: false })
        .where(eq(driverProfiles.id, driverId));
      await pushNotification(
        prof.userId,
        "تم رفض طلب التسجيل",
        "لم يتم اعتماد المستندات المرفقة، تواصل مع الدعم",
        "error",
      );
      return Response.json({ ok: true });
    }

    if (action === "ban") {
      await db
        .update(driverProfiles)
        .set({ status: "banned", isOnline: false })
        .where(eq(driverProfiles.id, driverId));
      await pushNotification(
        prof.userId,
        "تم إيقاف الحساب",
        "تم إيقاف حسابك من قبل الإدارة",
        "error",
      );
      return Response.json({ ok: true });
    }

    if (action === "unban") {
      await db
        .update(driverProfiles)
        .set({ status: "active" })
        .where(eq(driverProfiles.id, driverId));
      return Response.json({ ok: true });
    }

    if (action === "commission") {
      const rate = Math.max(0, Math.min(50, num(body.rate)));
      await db
        .update(driverProfiles)
        .set({ commissionRate: rate.toFixed(2) })
        .where(eq(driverProfiles.id, driverId));
      return Response.json({ ok: true });
    }

    if (action === "payout") {
      const amount = Math.min(num(body.amount), num(prof.balanceDue));
      if (amount <= 0)
        return Response.json({ error: "لا يوجد رصيد مستحق" }, { status: 400 });
      await db
        .update(driverProfiles)
        .set({
          balanceDue: (num(prof.balanceDue) - amount).toFixed(3),
          balancePaid: (num(prof.balancePaid) + amount).toFixed(3),
        })
        .where(eq(driverProfiles.id, driverId));
      await db.insert(driverLedger).values({
        driverUserId: prof.userId,
        type: "payout",
        amount: amount.toFixed(3),
        note: `تسوية مستحقات من الإدارة (${body.note ?? ""})`,
      });
      await pushNotification(
        prof.userId,
        "تم تحويل مستحقاتك 💵",
        `تم تحويل ${amount.toFixed(3)} د.ب إلى حسابك`,
        "success",
      );
      return Response.json({ ok: true });
    }

    return Response.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST() {
  try {
    await guard(["admin"]);
    const rows = await db
      .select({
        status: driverProfiles.status,
        c: sql<number>`count(*)::int`,
      })
      .from(driverProfiles)
      .groupBy(driverProfiles.status);
    return Response.json({ byStatus: rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
