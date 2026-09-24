import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  addons,
  driverProfiles,
  menuItems,
  itemSizes,
  orderItemAddons,
  orderItems,
  orders,
  restaurants,
  users,
} from "@/db/schema";
import { authErrorResponse, guard, type SessionUser } from "@/lib/auth";
import { pushNotification } from "@/lib/notify";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function attachItems(rows: (typeof orders.$inferSelect)[]) {
  if (!rows.length) return [];
  const ids = rows.map((o) => o.id);
  const its = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids));
  const addonsRows = its.length
    ? await db
        .select()
        .from(orderItemAddons)
        .where(inArray(orderItemAddons.orderItemId, its.map((i) => i.id)))
    : [];
  const rests = await db
    .select({ id: restaurants.id, nameAr: restaurants.nameAr, emoji: restaurants.emoji })
    .from(restaurants);
  const custs = await db
    .select({ id: users.id, fullName: users.fullName, phone: users.phone })
    .from(users);
  const drvs = await db
    .select({ id: users.id, fullName: users.fullName, phone: users.phone })
    .from(users);

  return rows.map((o) => ({
    ...o,
    restaurantName: rests.find((r) => r.id === o.restaurantId)?.nameAr ?? "—",
    restaurantEmoji: rests.find((r) => r.id === o.restaurantId)?.emoji ?? "🍽️",
    customerName: custs.find((c) => c.id === o.customerId)?.fullName ?? "—",
    customerPhone: custs.find((c) => c.id === o.customerId)?.phone ?? "",
    driverName: o.driverId
      ? drvs.find((d) => d.id === o.driverId)?.fullName ?? "—"
      : null,
    items: its
      .filter((i) => i.orderId === o.id)
      .map((i) => ({
        ...i,
        addons: addonsRows
          .filter((a) => a.orderItemId === i.id)
          .map((a) => ({ nameAr: a.nameAr, price: a.price })),
      })),
  }));
}

export async function GET(req: Request) {
  try {
    const user = await guard(["customer", "store", "driver", "admin"]);
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");

    if (user.role === "customer") {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, user.id))
        .orderBy(desc(orders.placedAt))
        .limit(60);
      return Response.json({ orders: await attachItems(rows) });
    }

    if (user.role === "store") {
      if (!user.restaurantId) return Response.json({ orders: [] });
      const statusFilter = url.searchParams.get("status");
      const conds = [eq(orders.restaurantId, user.restaurantId)];
      if (statusFilter === "active")
        conds.push(
          inArray(orders.status, [
            "pending",
            "accepted",
            "preparing",
            "ready",
            "assigned",
            "picked_up",
            "on_the_way",
          ]),
        );
      else if (statusFilter === "done") conds.push(eq(orders.status, "delivered"));
      else if (statusFilter === "cancelled")
        conds.push(eq(orders.status, "cancelled"));
      const rows = await db
        .select()
        .from(orders)
        .where(and(...conds))
        .orderBy(desc(orders.placedAt))
        .limit(80);
      return Response.json({ orders: await attachItems(rows) });
    }

    if (user.role === "driver") {
      const prof = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, user.id))
        .limit(1);
      const online = prof[0]?.isOnline ?? false;

      const active = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.driverId, user.id),
            inArray(orders.status, ["assigned", "picked_up", "on_the_way"]),
          ),
        )
        .orderBy(desc(orders.placedAt));

      const available = online
        ? await db
            .select()
            .from(orders)
            .where(and(eq(orders.status, "ready"), isNull(orders.driverId)))
            .orderBy(desc(orders.placedAt))
        : [];

      const history = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.driverId, user.id),
            inArray(orders.status, ["delivered", "cancelled"]),
          ),
        )
        .orderBy(desc(orders.placedAt))
        .limit(60);

      return Response.json({
        active: await attachItems(active),
        available: await attachItems(available),
        history: await attachItems(history),
        online,
      });
    }

    // admin
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.placedAt))
      .limit(scope === "all" ? 200 : 60);
    return Response.json({ orders: await attachItems(rows) });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/* ------------------------------------------------------------------ */
/* Create order                                                        */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const user: SessionUser = await guard(["customer"]);
    if (!user.emailVerified)
      return Response.json(
        { error: "يجب تأكيد البريد الإلكتروني قبل الطلب" },
        { status: 403 },
      );

    const body = await req.json();
    const restaurantId = Number(body.restaurantId);
    const items: {
      itemId: number;
      sizeId?: number | null;
      quantity: number;
      notes?: string;
      addons?: number[];
    }[] = body.items ?? [];

    if (!restaurantId || !items.length)
      return Response.json({ error: "السلة فارغة" }, { status: 400 });

    const restRows = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);
    const rest = restRows[0];
    if (!rest) return Response.json({ error: "المتجر غير موجود" }, { status: 404 });
    if (rest.status === "closed")
      return Response.json(
        { error: "المتجر مغلق حالياً ولا يمكن الطلب منه" },
        { status: 400 },
      );

    const paymentMethod = body.paymentMethod === "benefitpay" ? "benefitpay" : "card";
    if (paymentMethod === "card") {
      const cardNumber = String(body.cardNumber || "").replace(/\s/g, "");
      const expiry = String(body.expiry || "");
      const cvv = String(body.cvv || "");
      if (cardNumber.length < 12)
        return Response.json({ error: "رقم البطاقة غير صحيح" }, { status: 400 });
      if (!/^\d{2}\/\d{2}$/.test(expiry))
        return Response.json({ error: "تاريخ الانتهاء غير صحيح" }, { status: 400 });
      if (!/^\d{3,4}$/.test(cvv))
        return Response.json({ error: "رمز CVV غير صحيح" }, { status: 400 });
    } else {
      const phone = String(body.benefitPhone || "").replace(/\D/g, "");
      if (phone.length < 8)
        return Response.json(
          { error: "رقم جوال BenefitPay غير صحيح" },
          { status: 400 },
        );
    }

    const itemIds = items.map((i) => i.itemId);
    const dbItems = await db
      .select()
      .from(menuItems)
      .where(and(inArray(menuItems.id, itemIds), eq(menuItems.restaurantId, restaurantId)));
    if (dbItems.length !== itemIds.length)
      return Response.json({ error: "بعض الأصناف غير متاحة" }, { status: 400 });

    const allSizes = await db
      .select()
      .from(itemSizes)
      .where(inArray(itemSizes.itemId, itemIds));
    const addonIds = items.flatMap((i) => i.addons ?? []);
    const dbAddons = addonIds.length
      ? await db.select().from(addons).where(inArray(addons.id, addonIds))
      : [];

    let subtotal = 0;
    let discountAmount = 0;
    const built: {
      itemId: number;
      nameAr: string;
      sizeName: string | null;
      unitPrice: number;
      quantity: number;
      addonsTotal: number;
      lineTotal: number;
      notes: string;
      addonList: { nameAr: string; price: string }[];
    }[] = [];

    for (const line of items) {
      const item = dbItems.find((i) => i.id === line.itemId)!;
      if (!item.isAvailable)
        return Response.json(
          { error: `الصنف "${item.nameAr}" غير متوفر حالياً` },
          { status: 400 },
        );
      const size = line.sizeId
        ? allSizes.find((s) => s.id === line.sizeId)
        : undefined;
      const unit = num(size ? size.price : item.price);
      const qty = Math.max(1, Math.min(20, Number(line.quantity) || 1));
      const pickedAddons = (line.addons ?? [])
        .map((aid) => dbAddons.find((a) => a.id === aid))
        .filter(Boolean) as (typeof addons.$inferSelect)[];
      const addonsTotal = pickedAddons.reduce((s, a) => s + num(a.price), 0);
      const percent = Math.max(
        Number(item.discountPercent) || 0,
        Number(rest.discountPercent) || 0,
      );
      const gross = (unit + addonsTotal) * qty;
      const disc = (gross * percent) / 100;
      subtotal += gross;
      discountAmount += disc;
      built.push({
        itemId: item.id,
        nameAr: item.nameAr,
        sizeName: size?.nameAr ?? null,
        unitPrice: unit,
        quantity: qty,
        addonsTotal,
        lineTotal: gross - disc,
        notes: String(line.notes ?? ""),
        addonList: pickedAddons.map((a) => ({
          nameAr: a.nameAr,
          price: String(a.price),
        })),
      });
    }

    const deliveryFee = num(rest.deliveryFee);
    if (subtotal < num(rest.minOrder))
      return Response.json(
        { error: `الحد الأدنى للطلب هو ${num(rest.minOrder).toFixed(3)} د.ب` },
        { status: 400 },
      );

    const total = subtotal - discountAmount + deliveryFee;

    const inserted = await db
      .insert(orders)
      .values({
        code: `TMP-${Date.now()}`,
        customerId: user.id,
        restaurantId,
        status: "pending",
        paymentMethod,
        paymentStatus: "paid",
        subtotal: subtotal.toFixed(3),
        discountAmount: discountAmount.toFixed(3),
        deliveryFee: deliveryFee.toFixed(3),
        total: total.toFixed(3),
        storeCommission: rest.commissionPerOrder,
        driverCommissionRate: "10",
        driverCommission: (deliveryFee * 0.1).toFixed(3),
        governorateId: body.governorateId ? Number(body.governorateId) : null,
        areaId: body.areaId ? Number(body.areaId) : null,
        addressText: String(body.addressText || user.address || ""),
        notes: String(body.notes || ""),
        placedAt: new Date(),
      })
      .returning();

    const order = inserted[0];
    await db
      .update(orders)
      .set({ code: `LQ-${1000 + order.id}` })
      .where(eq(orders.id, order.id));

    for (const b of built) {
      const [oi] = await db
        .insert(orderItems)
        .values({
          orderId: order.id,
          itemId: b.itemId,
          nameAr: b.nameAr,
          sizeName: b.sizeName,
          unitPrice: b.unitPrice.toFixed(3),
          quantity: b.quantity,
          addonsTotal: b.addonsTotal.toFixed(3),
          lineTotal: b.lineTotal.toFixed(3),
          notes: b.notes,
        })
        .returning();
      if (b.addonList.length) {
        await db.insert(orderItemAddons).values(
          b.addonList.map((a) => ({
            orderItemId: oi.id,
            nameAr: a.nameAr,
            price: a.price,
          })),
        );
      }
    }

    if (rest.ownerUserId) {
      await pushNotification(
        rest.ownerUserId,
        "طلب جديد وارد 🔔",
        `طلب رقم LQ-${1000 + order.id} بقيمة ${total.toFixed(3)} د.ب`,
        "order",
        order.id,
      );
    }

    return Response.json({ ok: true, orderId: order.id, code: `LQ-${1000 + order.id}` });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}

export async function PATCH() {
  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      gross: sql<string>`coalesce(sum(total),0)`,
    })
    .from(orders);
  return Response.json({ stats: stats[0] });
}
