import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  addons,
  addonGroups,
  categories,
  itemSizes,
  menuItems,
  restaurants,
  reviews,
  users,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const restaurantId = Number(id);
  if (!restaurantId) return Response.json({ error: "غير صحيح" }, { status: 400 });

  const rows = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  const r = rows[0];
  if (!r) return Response.json({ error: "المتجر غير موجود" }, { status: 404 });

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

  const sizes = await db
    .select()
    .from(itemSizes)
    .where(inArray(itemSizes.itemId, items.map((i) => i.id)))
    .orderBy(asc(itemSizes.sortOrder));

  const groups = await db
    .select()
    .from(addonGroups)
    .where(inArray(addonGroups.itemId, items.map((i) => i.id)));

  const groupIds = groups.map((g) => g.id);
  const allAddons = groupIds.length
    ? await db
        .select()
        .from(addons)
        .where(inArray(addons.groupId, groupIds))
    : [];

  const revs = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      customerName: users.fullName,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.customerId))
    .where(eq(reviews.restaurantId, restaurantId))
    .orderBy(asc(reviews.id));

  return Response.json({
    restaurant: {
      id: r.id,
      nameAr: r.nameAr,
      cuisine: r.cuisine,
      description: r.description,
      imageUrl: r.imageUrl,
      emoji: r.emoji,
      status: r.status,
      rating: r.rating,
      ratingCount: r.ratingCount,
      minOrder: r.minOrder,
      deliveryFee: r.deliveryFee,
      prepMinutes: r.prepMinutes,
      discountPercent: r.discountPercent,
      address: r.address,
      phone: r.phone,
    },
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
          imageUrl: i.imageUrl,
          price: i.price,
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
              required: g.required,
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
    reviews: revs,
  });
}
