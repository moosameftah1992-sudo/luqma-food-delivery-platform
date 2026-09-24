import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants, users } from "@/db/schema";
import { authErrorResponse, guard, hashPassword } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guard(["admin"]);
    const { id } = await params;
    const restaurantId = Number(id);
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (["open", "busy", "closed"].includes(String(body.status)))
      patch.status = String(body.status);
    if (body.isActive !== undefined) patch.isActive = !!body.isActive;
    if (body.commissionPerOrder !== undefined)
      patch.commissionPerOrder = num(body.commissionPerOrder).toFixed(3);
    if (body.deliveryFee !== undefined)
      patch.deliveryFee = num(body.deliveryFee).toFixed(3);
    if (body.minOrder !== undefined)
      patch.minOrder = num(body.minOrder).toFixed(3);
    if (body.nameAr !== undefined) patch.nameAr = String(body.nameAr);
    if (body.cuisine !== undefined) patch.cuisine = String(body.cuisine);
    if (body.address !== undefined) patch.address = String(body.address);
    if (body.phone !== undefined) patch.phone = String(body.phone);
    if (body.description !== undefined) patch.description = String(body.description);
    if (body.discountPercent !== undefined)
      patch.discountPercent = Math.max(0, Math.min(70, Number(body.discountPercent) || 0));

    if (Object.keys(patch).length) {
      await db
        .update(restaurants)
        .set(patch)
        .where(eq(restaurants.id, restaurantId));
    }

    if (body.resetPassword) {
      const rest = (
        await db
          .select()
          .from(restaurants)
          .where(eq(restaurants.id, restaurantId))
          .limit(1)
      )[0];
      if (rest?.ownerUserId) {
        await db
          .update(users)
          .set({ passwordHash: hashPassword(String(body.resetPassword)) })
          .where(eq(users.id, rest.ownerUserId));
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guard(["admin"]);
    const { id } = await params;
    await db.delete(restaurants).where(eq(restaurants.id, Number(id)));
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
