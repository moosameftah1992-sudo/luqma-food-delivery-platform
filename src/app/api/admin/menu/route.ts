import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  addons,
  addonGroups,
  categories,
  itemSizes,
  menuItems,
  restaurants,
} from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await guard(["admin"]);
    const url = new URL(req.url);
    const restaurantId = Number(url.searchParams.get("restaurantId"));
    if (!restaurantId) return Response.json({ categories: [] });

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.restaurantId, restaurantId));
    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));
    const sizes = items.length
      ? await db
          .select()
          .from(itemSizes)
          .where(inArray(itemSizes.itemId, items.map((i) => i.id)))
      : [];
    const groups = items.length
      ? await db
          .select()
          .from(addonGroups)
          .where(inArray(addonGroups.itemId, items.map((i) => i.id)))
      : [];
    const allAddons = groups.length
      ? await db
          .select()
          .from(addons)
          .where(inArray(addons.groupId, groups.map((g) => g.id)))
      : [];
    const rest = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    return Response.json({
      restaurant: rest[0] ?? null,
      categories: cats.map((c) => ({
        id: c.id,
        nameAr: c.nameAr,
        items: items
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({
            id: i.id,
            nameAr: i.nameAr,
            price: i.price,
            pendingPrice: i.pendingPrice,
            isAvailable: i.isAvailable,
            discountPercent: i.discountPercent,
            sizes: sizes.filter((s) => s.itemId === i.id),
            groups: groups
              .filter((g) => g.itemId === i.id)
              .map((g) => ({
                id: g.id,
                nameAr: g.nameAr,
                addons: allAddons.filter((a) => a.groupId === g.id),
              })),
          })),
      })),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await guard(["admin"]);
    const body = await req.json();

    if (body.kind === "category") {
      const [row] = await db
        .insert(categories)
        .values({
          restaurantId: Number(body.restaurantId),
          nameAr: String(body.nameAr),
        })
        .returning();
      return Response.json({ ok: true, id: row.id });
    }

    if (body.kind === "item") {
      const [item] = await db
        .insert(menuItems)
        .values({
          restaurantId: Number(body.restaurantId),
          categoryId: body.categoryId ? Number(body.categoryId) : null,
          nameAr: String(body.nameAr),
          description: String(body.description ?? ""),
          emoji: String(body.emoji ?? "🍴"),
          price: num(body.price).toFixed(3),
          discountPercent: Math.max(0, Math.min(80, Number(body.discountPercent) || 0)),
        })
        .returning();
      return Response.json({ ok: true, id: item.id });
    }

    return Response.json({ error: "نوع غير معروف" }, { status: 400 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await guard(["admin"]);
    const body = await req.json();
    const id = Number(body.id);

    if (body.kind === "item") {
      const patch: Record<string, unknown> = {};
      if (body.nameAr !== undefined) patch.nameAr = String(body.nameAr);
      if (body.description !== undefined)
        patch.description = String(body.description);
      if (body.price !== undefined) patch.price = num(body.price).toFixed(3);
      if (body.isAvailable !== undefined) patch.isAvailable = !!body.isAvailable;
      if (body.discountPercent !== undefined)
        patch.discountPercent = Math.max(
          0,
          Math.min(80, Number(body.discountPercent) || 0),
        );
      if (body.categoryId !== undefined)
        patch.categoryId = Number(body.categoryId);
      await db.update(menuItems).set(patch).where(eq(menuItems.id, id));
      return Response.json({ ok: true });
    }

    if (body.kind === "size") {
      await db
        .update(itemSizes)
        .set({
          nameAr: String(body.nameAr),
          price: num(body.price).toFixed(3),
        })
        .where(eq(itemSizes.id, id));
      return Response.json({ ok: true });
    }

    if (body.kind === "addon") {
      await db
        .update(addons)
        .set({
          nameAr: String(body.nameAr),
          price: num(body.price).toFixed(3),
          isAvailable: body.isAvailable !== false,
        })
        .where(eq(addons.id, id));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "نوع غير معروف" }, { status: 400 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await guard(["admin"]);
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);
    if (body.kind === "size") {
      await db.delete(itemSizes).where(eq(itemSizes.id, id));
    } else if (body.kind === "addon") {
      await db.delete(addons).where(eq(addons.id, id));
    } else if (body.kind === "category") {
      await db
        .delete(menuItems)
        .where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, body.restaurantId)));
      await db.delete(categories).where(eq(categories.id, id));
    } else {
      await db.delete(menuItems).where(eq(menuItems.id, id));
    }
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
