import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, restaurants, reviews } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const governorateId = url.searchParams.get("governorateId");
  const areaId = url.searchParams.get("areaId");
  const cuisine = url.searchParams.get("cuisine");
  const q = url.searchParams.get("q");

  const filters = [eq(restaurants.isActive, true)];
  if (governorateId) filters.push(eq(restaurants.governorateId, Number(governorateId)));
  if (areaId) filters.push(eq(restaurants.areaId, Number(areaId)));
  if (cuisine && cuisine !== "الكل") filters.push(eq(restaurants.cuisine, cuisine));
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(ilike(restaurants.nameAr, like), ilike(restaurants.cuisine, like))!,
    );
  }

  const rows = await db
    .select()
    .from(restaurants)
    .where(and(...filters))
    .orderBy(desc(restaurants.rating), asc(restaurants.nameAr));

  const itemCounts = await db
    .select({ restaurantId: menuItems.restaurantId, id: menuItems.id })
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true));

  const allReviews = await db
    .select({
      restaurantId: reviews.restaurantId,
      rating: reviews.rating,
    })
    .from(reviews);

  return Response.json({
    restaurants: rows.map((r) => {
      const rs = allReviews.filter((x) => x.restaurantId === r.id);
      const avg = rs.length
        ? rs.reduce((s, x) => s + x.rating, 0) / rs.length
        : Number(r.rating);
      return {
        id: r.id,
        nameAr: r.nameAr,
        cuisine: r.cuisine,
        description: r.description,
        imageUrl: r.imageUrl,
        emoji: r.emoji,
        status: r.status,
        rating: avg.toFixed(1),
        ratingCount: r.ratingCount + rs.length,
        minOrder: r.minOrder,
        deliveryFee: r.deliveryFee,
        prepMinutes: r.prepMinutes,
        discountPercent: r.discountPercent,
        itemCount: itemCounts.filter((c) => c.restaurantId === r.id).length,
        address: r.address,
      };
    }),
  });
}
