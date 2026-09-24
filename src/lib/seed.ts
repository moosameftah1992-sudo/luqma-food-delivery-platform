import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  addons,
  addonGroups,
  appSettings,
  areas,
  categories,
  driverProfiles,
  governorates,
  menuItems,
  itemSizes,
  orders,
  orderItems,
  restaurants,
  users,
} from "@/db/schema";
import { GOVERNORATES, RESTAURANT_SEED } from "@/lib/seed-data";
import { hashPassword } from "@/lib/auth";

const SEED_KEY = "seed_version";
const SEED_VERSION = "3";
/** Arbitrary but stable key so concurrent workers serialise on one lock. */
const SEED_LOCK_KEY = 728419223;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Database initialisation is intentionally OFF during production runtime.
 *
 * `drizzle-kit push` (see drizzle.config.json) is the single source of truth for
 * schema. Running any kind of auto-migration/creation from the request path is
 * unsafe on serverless platforms: concurrent invocations race each other, which
 * is what produces errors such as `relation "areas" already exists`.
 *
 * Seeding is therefore:
 *   - skipped entirely in production unless ENABLE_AUTO_SEED=true,
 *   - serialised with a transaction-scoped advisory lock so at most one worker
 *     can seed at a time, and
 *   - idempotent (guarded by the app_settings seed_version marker).
 *
 * No DDL is ever emitted from application code.
 */
function autoSeedEnabled(): boolean {
  const flag = process.env.ENABLE_AUTO_SEED;
  if (process.env.NODE_ENV === "production") {
    return flag === "true";
  }
  return flag !== "false";
}

export async function ensureSeeded() {
  if (!autoSeedEnabled()) return;

  try {
    await db.transaction(async (tx) => {
      // Serialise concurrent workers; released automatically at COMMIT/ROLLBACK.
      await tx.execute(
        sql`select pg_advisory_xact_lock(${SEED_LOCK_KEY}::bigint)`,
      );

      const marker = await tx
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, SEED_KEY))
        .limit(1);
      if (marker[0]?.value === SEED_VERSION) return;

      const countRes = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(governorates);

      if ((countRes[0]?.c ?? 0) === 0) {
        await seedAll(tx);
      }

      await tx
        .insert(appSettings)
        .values({ key: SEED_KEY, value: SEED_VERSION })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: SEED_VERSION },
        });
    });
  } catch (err) {
    console.error("[luqma] seed skipped:", err);
  }
}

async function seedAll(tx: Tx) {
  /* ---------------------------------------------------------------- */
  /* Locations                                                         */
  /* ---------------------------------------------------------------- */
  const govRows = await tx
    .insert(governorates)
    .values(GOVERNORATES.map((g, i) => ({ nameAr: g.nameAr, sortOrder: i })))
    .returning();

  const areaValues: {
    governorateId: number;
    nameAr: string;
    deliveryFee: string;
  }[] = [];
  govRows.forEach((g, i) => {
    GOVERNORATES[i].areas.forEach((a) => {
      areaValues.push({
        governorateId: g.id,
        nameAr: a,
        deliveryFee: (0.6 + ((a.length % 5) * 0.15)).toFixed(3),
      });
    });
  });
  await tx.insert(areas).values(areaValues);

  const capital = govRows[0];
  const manama = await tx
    .select()
    .from(areas)
    .where(eq(areas.governorateId, capital.id))
    .limit(1);
  const defaultArea = manama[0]?.id ?? null;

  /* ---------------------------------------------------------------- */
  /* Users                                                             */
  /* ---------------------------------------------------------------- */
  // Seed credentials are configurable so demo logins can't silently drift from
  // what the team expects. Override with env vars, e.g. SEED_ADMIN_PASSWORD.
  const SEED_PASSWORDS = {
    admin: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
    store: process.env.SEED_STORE_PASSWORD || "store123",
    customer: process.env.SEED_CUSTOMER_PASSWORD || "customer123",
    driver: process.env.SEED_DRIVER_PASSWORD || "driver123",
  };

  const pw = hashPassword(SEED_PASSWORDS.admin);
  const storePw = hashPassword(SEED_PASSWORDS.store);
  const custPw = hashPassword(SEED_PASSWORDS.customer);
  const drvPw = hashPassword(SEED_PASSWORDS.driver);

  const insertedUsers = await tx
    .insert(users)
    .values([
      {
        email: "admin@luqma.bh",
        fullName: "مدير لقمة العام",
        passwordHash: pw,
        role: "admin" as const,
        status: "active" as const,
        emailVerified: true,
        phone: "+97336000000",
      },
      {
        email: "customer@luqma.bh",
        fullName: "محمد أحمد",
        passwordHash: custPw,
        role: "customer" as const,
        status: "active" as const,
        emailVerified: true,
        phone: "+97336110001",
        governorateId: capital.id,
        areaId: defaultArea,
        address: "المنامة - شارع الحكومة، بناية 12، شقة 4",
      },
      { email: "grills@luqma.bh", fullName: "مشويات لقمة الدار", passwordHash: storePw, role: "store" as const, status: "active" as const, emailVerified: true, phone: "+97317000111" },
      { email: "burger@luqma.bh", fullName: "برجر هاوس لقمة", passwordHash: storePw, role: "store" as const, status: "active" as const, emailVerified: true, phone: "+97317000222" },
      { email: "pizza@luqma.bh", fullName: "بيتزا روما الذهبية", passwordHash: storePw, role: "store" as const, status: "active" as const, emailVerified: true, phone: "+97317000333" },
      { email: "shawarma@luqma.bh", fullName: "شاورما الأصيل", passwordHash: storePw, role: "store" as const, status: "active" as const, emailVerified: true, phone: "+97317000444" },
      { email: "seafood@luqma.bh", fullName: "صياد الخليج", passwordHash: storePw, role: "store" as const, status: "active" as const, emailVerified: true, phone: "+97317000555" },
      { email: "sweets@luqma.bh", fullName: "حلويات لقمة الذهبية", passwordHash: storePw, role: "store" as const, status: "active" as const, emailVerified: true, phone: "+97317000666" },
      { email: "driver1@luqma.bh", fullName: "علي الدوسري", passwordHash: drvPw, role: "driver" as const, status: "active" as const, emailVerified: true, phone: "+97336220001" },
      { email: "driver2@luqma.bh", fullName: "حسن المناعي", passwordHash: drvPw, role: "driver" as const, status: "active" as const, emailVerified: true, phone: "+97336220002" },
      { email: "driver3@luqma.bh", fullName: "يوسف البحراني", passwordHash: drvPw, role: "driver" as const, status: "pending" as const, emailVerified: true, phone: "+97336220003" },
    ])
    .returning();

  const byEmail = (e: string) => insertedUsers.find((u) => u.email === e)!;
  const customer = byEmail("customer@luqma.bh");

  await tx.insert(driverProfiles).values([
    {
      userId: byEmail("driver1@luqma.bh").id,
      nationalId: "880123456",
      licenseNumber: "BH-DL-2019-88213",
      vehicleType: "دراجة نارية",
      vehiclePlate: "123456",
      termsAccepted: true,
      status: "active",
      isOnline: true,
      commissionRate: "10",
      balanceDue: "18.400",
      balancePaid: "12.000",
      completedOrders: 42,
    },
    {
      userId: byEmail("driver2@luqma.bh").id,
      nationalId: "901234567",
      licenseNumber: "BH-DL-2021-10455",
      vehicleType: "سيارة",
      vehiclePlate: "654321",
      termsAccepted: true,
      status: "active",
      isOnline: false,
      commissionRate: "12",
      balanceDue: "9.800",
      balancePaid: "4.000",
      completedOrders: 21,
    },
    {
      userId: byEmail("driver3@luqma.bh").id,
      nationalId: "950987654",
      licenseNumber: "BH-DL-2023-30122",
      vehicleType: "دراجة نارية",
      vehiclePlate: "778899",
      termsAccepted: true,
      status: "pending",
      isOnline: false,
      commissionRate: "10",
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* Restaurants + menus                                               */
  /* ---------------------------------------------------------------- */
  const ownerEmails = [
    "grills@luqma.bh",
    "burger@luqma.bh",
    "pizza@luqma.bh",
    "shawarma@luqma.bh",
    "seafood@luqma.bh",
    "sweets@luqma.bh",
  ];

  for (let i = 0; i < RESTAURANT_SEED.length; i++) {
    const r = RESTAURANT_SEED[i];
    const areaRows = await tx.select().from(areas).limit(50);
    const area = areaRows[(i * 7) % areaRows.length];
    const [rest] = await tx
      .insert(restaurants)
      .values({
        ownerUserId: byEmail(ownerEmails[i]).id,
        nameAr: r.nameAr,
        cuisine: r.cuisine,
        description: r.description,
        imageUrl: r.imageUrl,
        emoji: r.emoji,
        governorateId: area.governorateId,
        areaId: area.id,
        address: r.address,
        phone: r.phone,
        status: "open",
        rating: r.rating,
        ratingCount: r.ratingCount,
        minOrder: r.minOrder,
        deliveryFee: r.deliveryFee,
        prepMinutes: r.prepMinutes,
      })
      .returning();

    for (let c = 0; c < r.categories.length; c++) {
      const cat = r.categories[c];
      const [catRow] = await tx
        .insert(categories)
        .values({ restaurantId: rest.id, nameAr: cat.nameAr, sortOrder: c })
        .returning();

      for (let m = 0; m < cat.items.length; m++) {
        const it: any = cat.items[m];
        const [itemRow] = await tx
          .insert(menuItems)
          .values({
            restaurantId: rest.id,
            categoryId: catRow.id,
            nameAr: it.nameAr,
            description: it.description ?? "",
            emoji: it.emoji ?? "🍴",
            price: it.price,
            isAvailable: true,
            sortOrder: m,
          })
          .returning();

        if (it.sizes?.length) {
          await tx.insert(itemSizes).values(
            it.sizes.map((s: any, si: number) => ({
              itemId: itemRow.id,
              nameAr: s.nameAr,
              price: s.price,
              sortOrder: si,
            })),
          );
        }

        for (const g of it.groups ?? []) {
          const [grp] = await tx
            .insert(addonGroups)
            .values({
              itemId: itemRow.id,
              nameAr: g.nameAr,
              selectionType: g.type,
              required: false,
            })
            .returning();
          await tx.insert(addons).values(
            g.addons.map((a: any) => ({
              groupId: grp.id,
              nameAr: a.nameAr,
              price: a.price,
            })),
          );
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Demo orders                                                       */
  /* ---------------------------------------------------------------- */
  const rests = await tx.select().from(restaurants);
  const driver1 = byEmail("driver1@luqma.bh");

  const statuses = [
    "delivered",
    "delivered",
    "delivered",
    "delivered",
    "delivered",
    "cancelled",
    "delivered",
    "delivered",
    "delivered",
  ];

  for (let i = 0; i < statuses.length; i++) {
    const rest = rests[i % rests.length];
    const daysAgo = (i % 9) + 1;
    const placed = new Date(Date.now() - daysAgo * 86400000 - i * 3600000);
    const status = statuses[i];
    const subtotal = 6 + ((i * 2.7) % 12);
    const deliveryFee = Number(rest.deliveryFee);
    const total = subtotal + deliveryFee;
    const [o] = await tx
      .insert(orders)
      .values({
        code: `LQ-${1000 + i}`,
        customerId: customer.id,
        restaurantId: rest.id,
        driverId: status === "delivered" ? driver1.id : null,
        status: status as any,
        paymentMethod: i % 3 === 0 ? "benefitpay" : "card",
        subtotal: subtotal.toFixed(3),
        discountAmount: (i % 4 === 0 ? subtotal * 0.1 : 0).toFixed(3),
        deliveryFee: deliveryFee.toFixed(3),
        total: (i % 4 === 0 ? total - subtotal * 0.1 : total).toFixed(3),
        storeCommission: rest.commissionPerOrder,
        driverCommissionRate: "10",
        driverCommission: status === "delivered" ? (deliveryFee * 0.1).toFixed(3) : "0",
        governorateId: rest.governorateId,
        areaId: rest.areaId,
        addressText: customer.address ?? "",
        cancelReason: status === "cancelled" ? "المطبخ مغلق الآن" : null,
        cancelledBy: status === "cancelled" ? "store" : null,
        rating: status === "delivered" ? 4 + (i % 2) : null,
        placedAt: placed,
        acceptedAt: status === "cancelled" ? null : new Date(placed.getTime() + 120000),
        readyAt: status === "cancelled" ? null : new Date(placed.getTime() + 900000),
        assignedAt: status === "cancelled" ? null : new Date(placed.getTime() + 960000),
        deliveredAt:
          status === "delivered" ? new Date(placed.getTime() + 1800000) : null,
        cancelledAt: status === "cancelled" ? new Date(placed.getTime() + 300000) : null,
      })
      .returning();

    await tx.insert(orderItems).values({
      orderId: o.id,
      itemId: null,
      nameAr: "وجبة مختارة",
      sizeName: "وسط",
      unitPrice: subtotal.toFixed(3),
      quantity: 1,
      addonsTotal: "0",
      lineTotal: subtotal.toFixed(3),
    });
  }
}
