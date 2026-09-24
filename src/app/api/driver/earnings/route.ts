import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { driverLedger, driverProfiles, orderItems, orders } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await guard(["driver"]);
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const now = new Date();
    const from = fromParam ? new Date(String(fromParam)) : new Date(now.getTime() - 30 * 86400000);
    const to = toParam
      ? new Date(String(toParam) + "T23:59:59")
      : new Date(now.getTime() + 86400000);

    const prof = (
      await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, user.id))
        .limit(1)
    )[0];

    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.driverId, user.id),
          gte(orders.placedAt, from),
          lte(orders.placedAt, to),
        ),
      )
      .orderBy(asc(orders.placedAt));

    const its = rows.length
      ? await db.select().from(orderItems)
      : [];

    const delivered = rows.filter((r) => r.status === "delivered");

    const ledger = await db
      .select()
      .from(driverLedger)
      .where(
        and(
          eq(driverLedger.driverUserId, user.id),
          gte(driverLedger.createdAt, from),
          lte(driverLedger.createdAt, to),
        ),
      )
      .orderBy(asc(driverLedger.id));

    const daily: Record<string, { date: string; orders: number; fees: number; net: number }> = {};
    for (const r of delivered) {
      const d = new Date(r.deliveredAt ?? r.placedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      daily[key] ??= { date: key, orders: 0, fees: 0, net: 0 };
      daily[key].orders += 1;
      daily[key].fees += num(r.deliveryFee);
      daily[key].net += num(r.deliveryFee) - num(r.driverCommission);
    }

    return Response.json({
      from: from.toISOString(),
      to: to.toISOString(),
      profile: prof,
      rows: rows.map((r) => ({
        ...r,
        net: num(r.deliveryFee) - num(r.driverCommission),
      })),
      items: its,
      daily: Object.values(daily),
      summary: {
        delivered: delivered.length,
        cancelled: rows.filter((r) => r.status === "cancelled").length,
        fees: delivered.reduce((s, r) => s + num(r.deliveryFee), 0),
        commission: delivered.reduce((s, r) => s + num(r.driverCommission), 0),
        net: delivered.reduce(
          (s, r) => s + (num(r.deliveryFee) - num(r.driverCommission)),
          0,
        ),
        paid: ledger
          .filter((l) => l.type === "payout")
          .reduce((s, l) => s + num(l.amount), 0),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
