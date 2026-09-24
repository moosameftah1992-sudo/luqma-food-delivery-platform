import { asc } from "drizzle-orm";
import { db } from "@/db";
import { areas, governorates } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const govs = await db
    .select()
    .from(governorates)
    .orderBy(asc(governorates.sortOrder));
  const allAreas = await db.select().from(areas).orderBy(asc(areas.nameAr));

  return Response.json({
    governorates: govs.map((g) => ({
      id: g.id,
      nameAr: g.nameAr,
      areas: allAreas
        .filter((a) => a.governorateId === g.id)
        .map((a) => ({
          id: a.id,
          nameAr: a.nameAr,
          deliveryFee: a.deliveryFee,
        })),
    })),
  });
}
