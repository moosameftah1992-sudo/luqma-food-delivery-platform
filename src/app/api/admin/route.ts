import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  driverProfiles,
  orders,
  priceRequests,
  restaurants,
  users,
} from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await guard(["admin"]);

    const allOrders = await db.select().from(orders).orderBy(desc(orders.placedAt));
    const delivered = allOrders.filter((o) => o.status === "delivered");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = allOrders.filter((o) => new Date(o.placedAt) >= startOfDay);

    const rests = await db.select().from(restaurants);
    const drivers = await db
      .select()
      .from(driverProfiles)
      .orderBy(desc(driverProfiles.id));
    const pendingDrivers = drivers.filter((d) => d.status === "pending").length;

    const pendingPrices = await db
      .select()
      .from(priceRequests)
      .where(eq(priceRequests.status, "pending"))
      .orderBy(desc(priceRequests.id));

    const customers = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "customer"));

    const gmv = delivered.reduce((s, o) => s + num(o.total), 0);
    const storeCommission = delivered.reduce(
      (s, o) => s + num(o.storeCommission),
      0,
    );
    const driverCommission = delivered.reduce(
      (s, o) => s + num(o.driverCommission),
      0,
    );

    return Response.json({
      stats: {
        orders: allOrders.length,
        todayOrders: today.length,
        delivered: delivered.length,
        active: allOrders.filter((o) =>
          ["pending", "accepted", "preparing", "ready", "assigned", "picked_up", "on_the_way"].includes(
            o.status,
          ),
        ).length,
        gmv,
        storeCommission,
        driverCommission,
        netProfit: storeCommission + driverCommission,
        restaurants: rests.length,
        openRestaurants: rests.filter((r) => r.status === "open").length,
        drivers: drivers.length,
        onlineDrivers: drivers.filter((d) => d.isOnline).length,
        pendingDrivers,
        customers: customers[0]?.c ?? 0,
      },
      recentOrders: allOrders.slice(0, 8),
      pendingPrices,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
