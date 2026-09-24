import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders, restaurants } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId)
      return Response.json({ error: "لا يوجد متجر" }, { status: 404 });

    const url = new URL(req.url);
    const preset = url.searchParams.get("preset") ?? "today";
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getTime() + 86400000);

    if (preset === "today") {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
    } else if (preset === "week") {
      from = new Date(now.getTime() - 7 * 86400000);
    } else if (preset === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "custom") {
      from = url.searchParams.get("from")
        ? new Date(String(url.searchParams.get("from")))
        : new Date(now.getTime() - 7 * 86400000);
      to = url.searchParams.get("to")
        ? new Date(String(url.searchParams.get("to")) + "T23:59:59")
        : to;
    } else {
      from = new Date(now.getTime() - 30 * 86400000);
    }

    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, user.restaurantId),
          gte(orders.placedAt, from),
          lte(orders.placedAt, to),
        ),
      )
      .orderBy(asc(orders.placedAt));

    const rest = (
      await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, user.restaurantId))
        .limit(1)
    )[0];

    const its = rows.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, rows.map((r) => r.id)))
      : [];

    const menu = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, user.restaurantId));

    const delivered = rows.filter((r) => r.status === "delivered");
    const cancelled = rows.filter((r) => r.status === "cancelled");

    const gross = delivered.reduce((s, r) => s + num(r.subtotal), 0);
    const discounts = rows.reduce((s, r) => s + num(r.discountAmount), 0);
    const delivery = delivered.reduce((s, r) => s + num(r.deliveryFee), 0);
    const commission = delivered.length * num(rest?.commissionPerOrder ?? 0.5);

    const byItem: Record<string, { name: string; qty: number; total: number }> = {};
    for (const i of its) {
      const o = rows.find((r) => r.id === i.orderId);
      if (!o || o.status === "cancelled") continue;
      const key = String(i.nameAr);
      byItem[key] ??= { name: key, qty: 0, total: 0 };
      byItem[key].qty += i.quantity;
      byItem[key].total += num(i.lineTotal);
    }

    const daily: Record<string, { date: string; orders: number; sales: number }> = {};
    for (const r of delivered) {
      const d = new Date(r.placedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      daily[key] ??= { date: key, orders: 0, sales: 0 };
      daily[key].orders += 1;
      daily[key].sales += num(r.subtotal);
    }

    return Response.json({
      from: from.toISOString(),
      to: to.toISOString(),
      preset,
      summary: {
        orders: rows.length,
        delivered: delivered.length,
        cancelled: cancelled.length,
        gross,
        discounts,
        delivery,
        commission,
        net: gross - discounts - commission,
        avgOrder: delivered.length ? gross / delivered.length : 0,
      },
      rows,
      topItems: Object.values(byItem)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      daily: Object.values(daily),
      menuNames: menu.map((m) => m.nameAr),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
