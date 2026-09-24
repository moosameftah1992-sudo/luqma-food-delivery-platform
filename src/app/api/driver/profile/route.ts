import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { driverLedger, driverProfiles, orders } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await guard(["driver"]);
    const prof = (
      await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, user.id))
        .limit(1)
    )[0];

    const ledger = await db
      .select()
      .from(driverLedger)
      .where(eq(driverLedger.driverUserId, user.id))
      .orderBy(desc(driverLedger.id))
      .limit(100);

    const done = await db
      .select()
      .from(orders)
      .where(eq(orders.driverId, user.id));

    const delivered = done.filter((o) => o.status === "delivered");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = delivered.filter((o) => new Date(o.deliveredAt ?? 0) >= startOfDay);

    return Response.json({
      profile: prof,
      ledger,
      stats: {
        completed: delivered.length,
        todayCompleted: today.length,
        grossFees: delivered.reduce((s, o) => s + num(o.deliveryFee), 0),
        commission: delivered.reduce((s, o) => s + num(o.driverCommission), 0),
        net: delivered.reduce(
          (s, o) => s + (num(o.deliveryFee) - num(o.driverCommission)),
          0,
        ),
        balanceDue: num(prof?.balanceDue),
        balancePaid: num(prof?.balancePaid),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await guard(["driver"]);
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body.isOnline === "boolean") patch.isOnline = body.isOnline;
    if (body.vehicleType) patch.vehicleType = String(body.vehicleType);
    if (body.vehiclePlate) patch.vehiclePlate = String(body.vehiclePlate);
    if (!Object.keys(patch).length)
      return Response.json({ error: "لا يوجد تغيير" }, { status: 400 });

    await db
      .update(driverProfiles)
      .set(patch)
      .where(eq(driverProfiles.userId, user.id));
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
