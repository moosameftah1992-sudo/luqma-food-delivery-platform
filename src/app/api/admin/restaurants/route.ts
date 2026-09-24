import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orders, restaurants, users } from "@/db/schema";
import { authErrorResponse, guard, hashPassword } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await guard(["admin"]);
    const rests = await db
      .select()
      .from(restaurants)
      .orderBy(asc(restaurants.id));

    const owners = await db
      .select()
      .from(users)
      .where(eq(users.role, "store"));

    const allOrders = await db.select().from(orders);
    const itemCounts = await db.select().from(menuItems);

    return Response.json({
      restaurants: rests.map((r) => {
        const owner = owners.find((o) => o.id === r.ownerUserId);
        const mine = allOrders.filter((o) => o.restaurantId === r.id);
        const done = mine.filter((o) => o.status === "delivered");
        return {
          ...r,
          ownerEmail: owner?.email ?? null,
          ownerName: owner?.fullName ?? null,
          orderCount: mine.length,
          deliveredCount: done.length,
          sales: done.reduce((s, o) => s + num(o.subtotal), 0),
          itemCount: itemCounts.filter((i) => i.restaurantId === r.id).length,
        };
      }),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await guard(["admin"]);
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "store123");
    const nameAr = String(body.nameAr || "").trim();

    if (!email.includes("@")) throw new Error("بريد غير صحيح");
    if (nameAr.length < 2) throw new Error("اسم المتجر مطلوب");

    const exists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (exists[0]) throw new Error("البريد مستخدم مسبقاً");

    const [owner] = await db
      .insert(users)
      .values({
        email,
        fullName: String(body.ownerName || nameAr),
        passwordHash: hashPassword(password),
        role: "store",
        status: "active",
        emailVerified: true,
        phone: String(body.phone || ""),
      })
      .returning();

    const [rest] = await db
      .insert(restaurants)
      .values({
        ownerUserId: owner.id,
        nameAr,
        cuisine: String(body.cuisine || "عام"),
        description: String(body.description || ""),
        emoji: String(body.emoji || "🍽️"),
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        governorateId: body.governorateId ? Number(body.governorateId) : null,
        areaId: body.areaId ? Number(body.areaId) : null,
        address: String(body.address || ""),
        phone: String(body.phone || ""),
        minOrder: num(body.minOrder || 2).toFixed(3),
        deliveryFee: num(body.deliveryFee || 0.8).toFixed(3),
        prepMinutes: Number(body.prepMinutes || 25),
        commissionPerOrder: num(body.commissionPerOrder ?? 0.5).toFixed(3),
        status: "open",
      })
      .returning();

    return Response.json({ ok: true, id: rest.id, ownerEmail: email, password });
  } catch (err) {
    if (err instanceof Error)
      return Response.json({ error: err.message }, { status: 400 });
    return authErrorResponse(err);
  }
}

export async function PATCH() {
  const totals = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(restaurants);
  return Response.json({ count: totals[0]?.c ?? 0 });
}
