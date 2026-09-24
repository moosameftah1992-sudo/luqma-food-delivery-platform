import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orders, priceRequests, restaurants } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId)
      return Response.json({ error: "لا يوجد متجر مرتبط" }, { status: 404 });

    const rest = (
      await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, user.restaurantId))
        .limit(1)
    )[0];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const all = await db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, user.restaurantId));

    const today = all.filter((o) => new Date(o.placedAt) >= startOfDay);
    const done = all.filter((o) => o.status === "delivered");
    const todayDone = today.filter((o) => o.status === "delivered");

    const pendingCount = all.filter((o) => o.status === "pending").length;

    const pendingPrices = await db
      .select()
      .from(priceRequests)
      .where(
        and(
          eq(priceRequests.restaurantId, user.restaurantId),
          eq(priceRequests.status, "pending"),
        ),
      )
      .orderBy(desc(priceRequests.id));

    const itemCount = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.restaurantId, user.restaurantId));

    const sum = (arr: typeof all, key: "total" | "subtotal" | "deliveryFee") =>
      arr.reduce((s, o) => s + num(o[key]), 0);

    return Response.json({
      restaurant: rest,
      stats: {
        todayOrders: today.length,
        todaySales: sum(todayDone, "subtotal"),
        totalOrders: all.length,
        deliveredOrders: done.length,
        totalSales: sum(done, "subtotal"),
        commission: done.length * num(rest?.commissionPerOrder ?? 0.5),
        pendingCount,
        itemCount: itemCount.length,
        avgOrder: done.length ? sum(done, "subtotal") / done.length : 0,
      },
      pendingPrices,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId)
      return Response.json({ error: "لا يوجد متجر" }, { status: 404 });
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (["open", "busy", "closed"].includes(String(body.status)))
      patch.status = String(body.status);
    if (body.discountPercent !== undefined)
      patch.discountPercent = Math.max(
        0,
        Math.min(70, Number(body.discountPercent) || 0),
      );
    if (body.prepMinutes !== undefined)
      patch.prepMinutes = Math.max(5, Math.min(120, Number(body.prepMinutes) || 25));
    if (body.description !== undefined) patch.description = String(body.description);
    if (body.address !== undefined) patch.address = String(body.address);
    if (body.phone !== undefined) patch.phone = String(body.phone);

    if (!Object.keys(patch).length)
      return Response.json({ error: "لا يوجد تغيير" }, { status: 400 });

    await db
      .update(restaurants)
      .set(patch)
      .where(eq(restaurants.id, user.restaurantId));

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId)
      return Response.json({ error: "لا يوجد متجر" }, { status: 404 });
    const body = await req.json();
    const from = body.from ? new Date(String(body.from)) : null;
    const to = body.to ? new Date(String(body.to)) : null;

    const conds = [eq(orders.restaurantId, user.restaurantId)];
    if (from) conds.push(gte(orders.placedAt, from));
    if (to) conds.push(lte(orders.placedAt, to));

    const rows = await db
      .select()
      .from(orders)
      .where(and(...conds))
      .orderBy(desc(orders.placedAt));

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, user.restaurantId));

    return Response.json({
      rows,
      itemNames: Object.fromEntries(items.map((i) => [i.id, i.nameAr])),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE() {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId) return Response.json({ ok: true });
    const ids = (
      await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, user.restaurantId),
            inArray(orders.status, ["cancelled"]),
          ),
        )
    ).map((o) => o.id);
    return Response.json({ cleared: ids.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
