import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  addons,
  addonGroups,
  categories,
  itemSizes,
  menuItems,
  priceRequests,
  restaurants,
  users as usersTable,
} from "@/db/schema";
import { authErrorResponse, guard } from "@/lib/auth";
import { pushNotification } from "@/lib/notify";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function fullMenu(restaurantId: number) {
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId))
    .orderBy(asc(categories.sortOrder));
  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, restaurantId))
    .orderBy(asc(menuItems.sortOrder));
  const sizes = items.length
    ? await db
        .select()
        .from(itemSizes)
        .where(inArray(itemSizes.itemId, items.map((i) => i.id)))
        .orderBy(asc(itemSizes.sortOrder))
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
  const pending = await db
    .select()
    .from(priceRequests)
    .where(
      and(
        eq(priceRequests.restaurantId, restaurantId),
        eq(priceRequests.status, "pending"),
      ),
    );

  return {
    categories: cats.map((c) => ({
      id: c.id,
      nameAr: c.nameAr,
      items: items
        .filter((i) => i.categoryId === c.id)
        .map((i) => ({
          id: i.id,
          nameAr: i.nameAr,
          description: i.description,
          emoji: i.emoji,
          price: i.price,
          pendingPrice: i.pendingPrice,
          pendingRequest: pending.find((p) => p.itemId === i.id) ?? null,
          isAvailable: i.isAvailable,
          discountPercent: i.discountPercent,
          sizes: sizes
            .filter((s) => s.itemId === i.id)
            .map((s) => ({ id: s.id, nameAr: s.nameAr, price: s.price })),
          groups: groups
            .filter((g) => g.itemId === i.id)
            .map((g) => ({
              id: g.id,
              nameAr: g.nameAr,
              selectionType: g.selectionType,
              addons: allAddons
                .filter((a) => a.groupId === g.id)
                .map((a) => ({
                  id: a.id,
                  nameAr: a.nameAr,
                  price: a.price,
                  isAvailable: a.isAvailable,
                })),
            })),
        })),
    })),
  };
}

export async function GET() {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId) return Response.json({ categories: [] });
    return Response.json(await fullMenu(user.restaurantId));
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

    if (body.kind === "category") {
      const [row] = await db
        .insert(categories)
        .values({
          restaurantId: user.restaurantId,
          nameAr: String(body.nameAr || "قسم جديد"),
          sortOrder: Number(body.sortOrder ?? 99),
        })
        .returning();
      return Response.json({ ok: true, id: row.id });
    }

    if (body.kind === "item") {
      const [item] = await db
        .insert(menuItems)
        .values({
          restaurantId: user.restaurantId,
          categoryId: Number(body.categoryId),
          nameAr: String(body.nameAr),
          description: String(body.description ?? ""),
          emoji: String(body.emoji ?? "🍴"),
          price: (Math.max(0, num(body.price))).toFixed(3),
          isAvailable: true,
          sortOrder: Number(body.sortOrder ?? 99),
        })
        .returning();

      const sizes: { nameAr: string; price: string }[] = body.sizes ?? [];
      for (let i = 0; i < sizes.length; i++) {
        await db.insert(itemSizes).values({
          itemId: item.id,
          nameAr: String(sizes[i].nameAr),
          price: num(sizes[i].price).toFixed(3),
          sortOrder: i,
        });
      }
      for (const g of body.groups ?? []) {
        if (!g.nameAr) continue;
        const [grp] = await db
          .insert(addonGroups)
          .values({
            itemId: item.id,
            nameAr: String(g.nameAr),
            selectionType: g.selectionType === "single" ? "single" : "multi",
          })
          .returning();
        for (const a of g.addons ?? []) {
          if (!a.nameAr) continue;
          await db.insert(addons).values({
            groupId: grp.id,
            nameAr: String(a.nameAr),
            price: num(a.price).toFixed(3),
          });
        }
      }
      return Response.json({ ok: true, id: item.id });
    }

    if (body.kind === "addon_group" && body.itemId) {
      const [grp] = await db
        .insert(addonGroups)
        .values({
          itemId: Number(body.itemId),
          nameAr: String(body.nameAr),
          selectionType: body.selectionType === "single" ? "single" : "multi",
        })
        .returning();
      for (const a of body.addons ?? []) {
        if (!a.nameAr) continue;
        await db.insert(addons).values({
          groupId: grp.id,
          nameAr: String(a.nameAr),
          price: num(a.price).toFixed(3),
        });
      }
      return Response.json({ ok: true, id: grp.id });
    }

    return Response.json({ error: "نوع غير معروف" }, { status: 400 });
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

    /* toggle availability */
    if (body.kind === "item_availability") {
      const item = (
        await db
          .select()
          .from(menuItems)
          .where(
            and(
              eq(menuItems.id, Number(body.id)),
              eq(menuItems.restaurantId, user.restaurantId),
            ),
          )
          .limit(1)
      )[0];
      if (!item) return Response.json({ error: "الصنف غير موجود" }, { status: 404 });
      await db
        .update(menuItems)
        .set({ isAvailable: !item.isAvailable })
        .where(eq(menuItems.id, item.id));
      return Response.json({ ok: true, isAvailable: !item.isAvailable });
    }

    /* discount on item */
    if (body.kind === "item_discount") {
      await db
        .update(menuItems)
        .set({
          discountPercent: Math.max(0, Math.min(80, Number(body.percent) || 0)),
        })
        .where(
          and(
            eq(menuItems.id, Number(body.id)),
            eq(menuItems.restaurantId, user.restaurantId),
          ),
        );
      return Response.json({ ok: true });
    }

    /* price change -> needs admin approval */
    if (body.kind === "item_price") {
      const item = (
        await db
          .select()
          .from(menuItems)
          .where(
            and(
              eq(menuItems.id, Number(body.id)),
              eq(menuItems.restaurantId, user.restaurantId),
            ),
          )
          .limit(1)
      )[0];
      if (!item) return Response.json({ error: "الصنف غير موجود" }, { status: 404 });
      const newPrice = Math.max(0, num(body.price));
      if (newPrice === num(item.price))
        return Response.json({ error: "السعر لم يتغير" }, { status: 400 });

      await db
        .update(menuItems)
        .set({ pendingPrice: newPrice.toFixed(3) })
        .where(eq(menuItems.id, item.id));

      const existing = await db
        .select()
        .from(priceRequests)
        .where(
          and(
            eq(priceRequests.itemId, item.id),
            eq(priceRequests.status, "pending"),
          ),
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(priceRequests)
          .set({ newPrice: newPrice.toFixed(3), reason: String(body.reason ?? "") })
          .where(eq(priceRequests.id, existing[0].id));
      } else {
        await db.insert(priceRequests).values({
          restaurantId: user.restaurantId,
          itemId: item.id,
          itemName: item.nameAr,
          oldPrice: String(item.price),
          newPrice: newPrice.toFixed(3),
          reason: String(body.reason ?? ""),
        });
      }

      const admins = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.role, "admin"));
      for (const a of admins) {
        await pushNotification(
          a.id,
          "طلب تغيير سعر 💰",
          `${item.nameAr}: ${num(item.price).toFixed(3)} ← ${newPrice.toFixed(3)} د.ب`,
          "order",
          null,
        );
      }

      return Response.json({
        ok: true,
        message: "تم إرسال طلب تغيير السعر للإدارة",
      });
    }

    /* rename item */
    if (body.kind === "item_rename") {
      await db
        .update(menuItems)
        .set({
          nameAr: String(body.nameAr),
          description: String(body.description ?? ""),
          emoji: String(body.emoji ?? "🍴"),
        })
        .where(
          and(
            eq(menuItems.id, Number(body.id)),
            eq(menuItems.restaurantId, user.restaurantId),
          ),
        );
      return Response.json({ ok: true });
    }

    return Response.json({ error: "نوع غير معروف" }, { status: 400 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId)
      return Response.json({ error: "لا يوجد متجر" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);

    if (body.kind === "category") {
      await db
        .delete(menuItems)
        .where(
          and(
            eq(menuItems.categoryId, id),
            eq(menuItems.restaurantId, user.restaurantId),
          ),
        );
      await db
        .delete(categories)
        .where(
          and(eq(categories.id, id), eq(categories.restaurantId, user.restaurantId)),
        );
      return Response.json({ ok: true });
    }

    if (body.kind === "addon") {
      await db.delete(addons).where(eq(addons.id, id));
      return Response.json({ ok: true });
    }

    // default: delete item
    await db
      .delete(menuItems)
      .where(
        and(eq(menuItems.id, id), eq(menuItems.restaurantId, user.restaurantId)),
      );
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await guard(["store"]);
    if (!user.restaurantId)
      return Response.json({ error: "لا يوجد متجر" }, { status: 404 });
    const body = await req.json();
    if (body.kind === "size_price") {
      await db
        .update(itemSizes)
        .set({ price: Math.max(0, num(body.price)).toFixed(3) })
        .where(eq(itemSizes.id, Number(body.id)));
      return Response.json({ ok: true });
    }
    if (body.kind === "addon_price") {
      await db
        .update(addons)
        .set({ price: Math.max(0, num(body.price)).toFixed(3) })
        .where(eq(addons.id, Number(body.id)));
      return Response.json({ ok: true });
    }
    return Response.json({ error: "نوع غير معروف" }, { status: 400 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
