import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, priceRequests, restaurants } from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { pushNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await guard(["admin"]);
    const rows = await db
      .select({
        request: priceRequests,
        restaurantName: restaurants.nameAr,
        ownerId: restaurants.ownerUserId,
      })
      .from(priceRequests)
      .innerJoin(restaurants, eq(restaurants.id, priceRequests.restaurantId))
      .orderBy(desc(priceRequests.id))
      .limit(100);
    return Response.json({
      requests: rows.map((r) => ({
        ...r.request,
        restaurantName: r.restaurantName,
        ownerId: r.ownerId,
      })),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await guard(["admin"]);
    const body = await req.json();
    const id = Number(body.id);
    const decision = String(body.decision); // approved | rejected
    const note = String(body.note ?? "");

    const req0 = (
      await db
        .select()
        .from(priceRequests)
        .where(eq(priceRequests.id, id))
        .limit(1)
    )[0];
    if (!req0) return Response.json({ error: "الطلب غير موجود" }, { status: 404 });

    await db
      .update(priceRequests)
      .set({
        status: decision === "approved" ? "approved" : "rejected",
        reviewedAt: new Date(),
        reviewedNote: note,
      })
      .where(eq(priceRequests.id, id));

    const rest = (
      await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, req0.restaurantId))
        .limit(1)
    )[0];

    if (decision === "approved") {
      await db
        .update(menuItems)
        .set({ price: req0.newPrice, pendingPrice: null })
        .where(eq(menuItems.id, req0.itemId));
      await pushNotification(
        rest?.ownerUserId,
        "تمت الموافقة على تعديل السعر ✅",
        `${req0.itemName}: ${req0.newPrice} د.ب`,
        "success",
      );
    } else {
      await db
        .update(menuItems)
        .set({ pendingPrice: null })
        .where(eq(menuItems.id, req0.itemId));
      await pushNotification(
        rest?.ownerUserId,
        "تم رفض تعديل السعر ❌",
        `${req0.itemName}: ${note || "بدون سبب"}`,
        "error",
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
