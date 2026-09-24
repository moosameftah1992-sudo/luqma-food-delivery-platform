import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  driverLedger,
  driverProfiles,
  orderItemAddons,
  orderItems,
  orders,
  restaurants,
  reviews,
} from "@/db/schema";
import { authErrorResponse, guard, type SessionUser } from "@/lib/auth";
import { pushNotification } from "@/lib/notify";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await guard(["customer", "store", "driver", "admin"]);
    const { id } = await params;
    const orderId = Number(id);

    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = rows[0];
    if (!order) return Response.json({ error: "الطلب غير موجود" }, { status: 404 });

    const allowed =
      user.role === "admin" ||
      (user.role === "customer" && order.customerId === user.id) ||
      (user.role === "store" && order.restaurantId === user.restaurantId) ||
      (user.role === "driver" &&
        (order.driverId === user.id || order.driverId === null));
    if (!allowed)
      return Response.json({ error: "لا تملك صلاحية العرض" }, { status: 403 });

    const its = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    const addons = its.length
      ? await db
          .select()
          .from(orderItemAddons)
          .where(inArray(orderItemAddons.orderItemId, its.map((i) => i.id)))
      : [];

    const rest = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, order.restaurantId))
      .limit(1);

    return Response.json({
      order: {
        ...order,
        restaurantName: rest[0]?.nameAr ?? "—",
        restaurantEmoji: rest[0]?.emoji ?? "🍽️",
        restaurantAddress: rest[0]?.address ?? "",
        restaurantPhone: rest[0]?.phone ?? "",
        items: its.map((i) => ({
          ...i,
          addons: addons.filter((a) => a.orderItemId === i.id),
        })),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user: SessionUser = await guard([
      "customer",
      "store",
      "driver",
      "admin",
    ]);
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();
    const action = String(body.action || "");
    const reason = String(body.reason || "").trim();

    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = rows[0];
    if (!order) return Response.json({ error: "الطلب غير موجود" }, { status: 404 });

    const rest = (
      await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, order.restaurantId))
        .limit(1)
    )[0];

    const setStatus = async (status: string, extra: Record<string, unknown> = {}) => {
      await db
        .update(orders)
        .set({ status: status as never, ...extra })
        .where(eq(orders.id, orderId));
    };

    /* ---------------- customer cancel (5 min rule) ---------------- */
    if (action === "cancel" && user.role === "customer") {
      if (order.customerId !== user.id)
        return Response.json({ error: "غير مصرح" }, { status: 403 });
      if (order.status !== "pending")
        return Response.json(
          { error: "لا يمكن الإلغاء بعد بدء تحضير الطلب" },
          { status: 400 },
        );
      const diffMin = (Date.now() - new Date(order.placedAt).getTime()) / 60000;
      if (diffMin > 5)
        return Response.json(
          { error: "انتهت مهلة الإلغاء (5 دقائق)" },
          { status: 400 },
        );
      if (!reason)
        return Response.json({ error: "سبب الإلغاء مطلوب" }, { status: 400 });

      await setStatus("cancelled", {
        cancelReason: reason,
        cancelledBy: "customer",
        cancelledAt: new Date(),
      });
      if (rest?.ownerUserId)
        await pushNotification(
          rest.ownerUserId,
          "تم إلغاء طلب ❌",
          `الطلب ${order.code} — ${reason}`,
          "error",
          orderId,
        );
      return Response.json({ ok: true });
    }

    /* ---------------- rate ---------------- */
    if (action === "rate" && user.role === "customer") {
      if (order.customerId !== user.id)
        return Response.json({ error: "غير مصرح" }, { status: 403 });
      if (order.status !== "delivered")
        return Response.json(
          { error: "يمكن التقييم بعد التوصيل فقط" },
          { status: 400 },
        );
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      await db
        .update(orders)
        .set({ rating })
        .where(eq(orders.id, orderId));
      await db.insert(reviews).values({
        orderId,
        restaurantId: order.restaurantId,
        customerId: user.id,
        rating,
        comment: String(body.comment || ""),
      });
      if (rest) {
        const all = await db
          .select()
          .from(reviews)
          .where(eq(reviews.restaurantId, rest.id));
        const avg =
          all.reduce((s, r) => s + r.rating, 0) / Math.max(1, all.length);
        await db
          .update(restaurants)
          .set({ rating: avg.toFixed(2), ratingCount: all.length })
          .where(eq(restaurants.id, rest.id));
      }
      return Response.json({ ok: true });
    }

    /* ---------------- store actions ---------------- */
    if (user.role === "store") {
      if (order.restaurantId !== user.restaurantId)
        return Response.json({ error: "غير مصرح" }, { status: 403 });

      if (action === "accept") {
        if (order.status !== "pending")
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        await setStatus("accepted", { acceptedAt: new Date() });
        await pushNotification(
          order.customerId,
          "تم قبول طلبك ✅",
          `${rest?.nameAr ?? "المتجر"} بدأ تحضير طلبك ${order.code}`,
          "success",
          orderId,
        );
        return Response.json({ ok: true });
      }

      if (action === "reject") {
        if (order.status !== "pending")
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        if (!reason)
          return Response.json({ error: "سبب الرفض مطلوب" }, { status: 400 });
        await setStatus("cancelled", {
          cancelReason: reason,
          cancelledBy: "store",
          cancelledAt: new Date(),
        });
        await pushNotification(
          order.customerId,
          "تم اعتذار المتجر عن الطلب",
          `${rest?.nameAr ?? "المتجر"}: ${reason}`,
          "error",
          orderId,
        );
        return Response.json({ ok: true });
      }

      if (action === "ready") {
        if (!["accepted", "preparing"].includes(order.status))
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        await setStatus("ready", { readyAt: new Date() });
        return Response.json({ ok: true });
      }

      if (action === "cancel") {
        if (["delivered", "cancelled"].includes(order.status))
          return Response.json({ error: "لا يمكن إلغاء هذا الطلب" }, { status: 400 });
        if (!reason)
          return Response.json({ error: "سبب الإلغاء مطلوب" }, { status: 400 });
        await setStatus("cancelled", {
          cancelReason: reason,
          cancelledBy: "store",
          cancelledAt: new Date(),
        });
        await pushNotification(
          order.customerId,
          "تم إلغاء الطلب من المتجر",
          reason,
          "error",
          orderId,
        );
        return Response.json({ ok: true });
      }
    }

    /* ---------------- driver actions ---------------- */
    if (user.role === "driver") {
      const prof = (
        await db
          .select()
          .from(driverProfiles)
          .where(eq(driverProfiles.userId, user.id))
          .limit(1)
      )[0];

      if (action === "accept_delivery") {
        if (!prof?.isOnline)
          return Response.json(
            { error: "يجب أن تكون متصلاً (أونلاين) لقبول الطلبات" },
            { status: 400 },
          );
        const fresh = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.id, orderId),
              eq(orders.status, "ready"),
              isNull(orders.driverId),
            ),
          )
          .limit(1);
        if (!fresh[0])
          return Response.json(
            { error: "سبقك مندوب آخر إلى هذا الطلب" },
            { status: 409 },
          );
        await db
          .update(orders)
          .set({
            status: "assigned",
            driverId: user.id,
            assignedAt: new Date(),
            driverCommissionRate: prof?.commissionRate ?? "10",
            driverCommission: (
              (num(order.deliveryFee) * num(prof?.commissionRate ?? 10)) /
              100
            ).toFixed(3),
          })
          .where(eq(orders.id, orderId));
        await pushNotification(
          order.customerId,
          "تم تعيين المندوب 🛵",
          `المندوب ${user.fullName} في طريقه لاستلام طلبك ${order.code}`,
          "info",
          orderId,
        );
        return Response.json({ ok: true });
      }

      if (order.driverId !== user.id)
        return Response.json({ error: "غير مصرح" }, { status: 403 });

      if (action === "picked_up") {
        if (order.status !== "assigned")
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        await setStatus("picked_up");
        return Response.json({ ok: true });
      }

      if (action === "on_the_way") {
        if (order.status !== "picked_up")
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        await setStatus("on_the_way");
        await pushNotification(
          order.customerId,
          "طلبك في الطريق 🛵",
          `المندوب ${user.fullName} في طريقه إليك`,
          "info",
          orderId,
        );
        return Response.json({ ok: true });
      }

      if (action === "delivered") {
        if (!["picked_up", "on_the_way"].includes(order.status))
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        await setStatus("delivered", { deliveredAt: new Date() });
        const fee = num(order.deliveryFee);
        const rate = num(prof?.commissionRate ?? 10);
        const commission = (fee * rate) / 100;
        const net = fee - commission;
        if (prof) {
          await db
            .update(driverProfiles)
            .set({
              completedOrders: (prof.completedOrders ?? 0) + 1,
              balanceDue: (num(prof.balanceDue) + net).toFixed(3),
            })
            .where(eq(driverProfiles.id, prof.id));
        }
        await db.insert(driverLedger).values({
          driverUserId: user.id,
          orderId,
          type: "earning",
          amount: net.toFixed(3),
          note: `توصيل طلب ${order.code} (عمولة ${rate}% = ${commission.toFixed(3)})`,
        });
        await pushNotification(
          order.customerId,
          "تم التوصيل 🎉",
          `طلبك ${order.code} تم تسليمه. بالهناء والشفاء!`,
          "success",
          orderId,
        );
        return Response.json({ ok: true });
      }

      if (action === "driver_cancel") {
        if (!["assigned", "picked_up", "on_the_way"].includes(order.status))
          return Response.json({ error: "حالة الطلب لا تسمح" }, { status: 400 });
        if (!reason)
          return Response.json({ error: "سبب الإلغاء مطلوب" }, { status: 400 });
        await db
          .update(orders)
          .set({
            status: "ready",
            driverId: null,
            assignedAt: null,
            cancelReason: reason,
            cancelledBy: "driver",
            notes: `${order.notes}\n[إلغاء المندوب ${user.fullName}] ${reason}`.trim(),
          })
          .where(eq(orders.id, orderId));
        if (rest?.ownerUserId)
          await pushNotification(
            rest.ownerUserId,
            "المندوب اعتذر عن التوصيل",
            `الطلب ${order.code} عاد للتوزيع — ${reason}`,
            "error",
            orderId,
          );
        return Response.json({ ok: true });
      }
    }

    /* ---------------- admin ---------------- */
    if (user.role === "admin") {
      if (action === "cancel") {
        if (order.status === "delivered")
          return Response.json({ error: "الطلب مُسلّم" }, { status: 400 });
        if (!reason)
          return Response.json({ error: "سبب الإلغاء مطلوب" }, { status: 400 });
        await setStatus("cancelled", {
          cancelReason: reason,
          cancelledBy: "admin",
          cancelledAt: new Date(),
        });
        await pushNotification(
          order.customerId,
          "تم إلغاء الطلب من الإدارة",
          reason,
          "error",
          orderId,
        );
        return Response.json({ ok: true });
      }
    }

    return Response.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
