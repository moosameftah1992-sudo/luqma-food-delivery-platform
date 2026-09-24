import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "store",
  "driver",
  "admin",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "pending",
  "active",
  "suspended",
  "rejected",
  "banned",
]);

export const storeStatusEnum = pgEnum("store_status", [
  "open",
  "busy",
  "closed",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "benefitpay",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
]);

/* ------------------------------------------------------------------ */
/* Users & sessions                                                    */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    status: accountStatusEnum("status").notNull().default("active"),
    emailVerified: boolean("email_verified").notNull().default(false),
    verifyToken: text("verify_token"),
    governorateId: integer("governorate_id"),
    areaId: integer("area_id"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

export const governorates = pgTable("governorates", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const areas = pgTable(
  "areas",
  {
    id: serial("id").primaryKey(),
    governorateId: integer("governorate_id")
      .notNull()
      .references(() => governorates.id, { onDelete: "cascade" }),
    nameAr: text("name_ar").notNull(),
    deliveryFee: numeric("delivery_fee", { precision: 8, scale: 3 })
      .notNull()
      .default("0.800"),
  },
  (t) => [index("areas_gov_idx").on(t.governorateId)],
);

/* ------------------------------------------------------------------ */
/* Restaurants & menus                                                 */
/* ------------------------------------------------------------------ */

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  nameAr: text("name_ar").notNull(),
  cuisine: text("cuisine").notNull().default("عام"),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  emoji: text("emoji").notNull().default("🍽️"),
  governorateId: integer("governorate_id"),
  areaId: integer("area_id"),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  status: storeStatusEnum("status").notNull().default("open"),
  isActive: boolean("is_active").notNull().default(true),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("4.50"),
  ratingCount: integer("rating_count").notNull().default(0),
  minOrder: numeric("min_order", { precision: 8, scale: 3 })
    .notNull()
    .default("2.000"),
  deliveryFee: numeric("delivery_fee", { precision: 8, scale: 3 })
    .notNull()
    .default("0.800"),
  prepMinutes: integer("prep_minutes").notNull().default(25),
  commissionPerOrder: numeric("commission_per_order", {
    precision: 8,
    scale: 3,
  })
    .notNull()
    .default("0.500"),
  discountPercent: integer("discount_percent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    nameAr: text("name_ar").notNull(),
    description: text("description").notNull().default(""),
    emoji: text("emoji").notNull().default("🍴"),
    imageUrl: text("image_url"),
    price: numeric("price", { precision: 8, scale: 3 }).notNull().default("0"),
    pendingPrice: numeric("pending_price", { precision: 8, scale: 3 }),
    isAvailable: boolean("is_available").notNull().default(true),
    calories: integer("calories"),
    discountPercent: integer("discount_percent").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("menu_items_restaurant_idx").on(t.restaurantId)],
);

export const itemSizes = pgTable("item_sizes", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  price: numeric("price", { precision: 8, scale: 3 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const addonGroups = pgTable("addon_groups", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  selectionType: text("selection_type").notNull().default("multi"),
  required: boolean("required").notNull().default(false),
});

export const addons = pgTable("addons", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => addonGroups.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  price: numeric("price", { precision: 8, scale: 3 }).notNull().default("0"),
  isAvailable: boolean("is_available").notNull().default(true),
});

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    driverId: integer("driver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("card"),
    paymentStatus: text("payment_status").notNull().default("paid"),
    subtotal: numeric("subtotal", { precision: 10, scale: 3 })
      .notNull()
      .default("0"),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 3 })
      .notNull()
      .default("0"),
    deliveryFee: numeric("delivery_fee", { precision: 8, scale: 3 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 10, scale: 3 }).notNull().default("0"),
    storeCommission: numeric("store_commission", { precision: 8, scale: 3 })
      .notNull()
      .default("0.500"),
    driverCommission: numeric("driver_commission", { precision: 8, scale: 3 })
      .notNull()
      .default("0"),
    driverCommissionRate: numeric("driver_commission_rate", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("10"),
    governorateId: integer("governorate_id"),
    areaId: integer("area_id"),
    addressText: text("address_text").notNull().default(""),
    notes: text("notes").notNull().default(""),
    cancelReason: text("cancel_reason"),
    cancelledBy: text("cancelled_by"),
    rating: integer("rating"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("orders_code_unique").on(t.code),
    index("orders_customer_idx").on(t.customerId),
    index("orders_restaurant_idx").on(t.restaurantId),
    index("orders_driver_idx").on(t.driverId),
  ],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  itemId: integer("item_id"),
  nameAr: text("name_ar").notNull(),
  sizeName: text("size_name"),
  unitPrice: numeric("unit_price", { precision: 8, scale: 3 })
    .notNull()
    .default("0"),
  quantity: integer("quantity").notNull().default(1),
  addonsTotal: numeric("addons_total", { precision: 8, scale: 3 })
    .notNull()
    .default("0"),
  lineTotal: numeric("line_total", { precision: 10, scale: 3 })
    .notNull()
    .default("0"),
  notes: text("notes").notNull().default(""),
});

export const orderItemAddons = pgTable("order_item_addons", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  price: numeric("price", { precision: 8, scale: 3 }).notNull().default("0"),
});

/* ------------------------------------------------------------------ */
/* Reviews, price requests, discounts                                  */
/* ------------------------------------------------------------------ */

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const priceRequests = pgTable("price_requests", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  oldPrice: numeric("old_price", { precision: 8, scale: 3 }).notNull(),
  newPrice: numeric("new_price", { precision: 8, scale: 3 }).notNull(),
  reason: text("reason").notNull().default(""),
  status: requestStatusEnum("status").notNull().default("pending"),
  reviewedNote: text("reviewed_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  itemId: integer("item_id"),
  title: text("title").notNull(),
  percent: integer("percent").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Drivers                                                             */
/* ------------------------------------------------------------------ */

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nationalId: text("national_id").notNull().default(""),
    licenseNumber: text("license_number").notNull().default(""),
    vehicleType: text("vehicle_type").notNull().default("دراجة نارية"),
    vehiclePlate: text("vehicle_plate").notNull().default(""),
    idCardUrl: text("id_card_url").notNull().default(""),
    licenseUrl: text("license_url").notNull().default(""),
    termsAccepted: boolean("terms_accepted").notNull().default(false),
    status: accountStatusEnum("status").notNull().default("pending"),
    isOnline: boolean("is_online").notNull().default(false),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("10"),
    balanceDue: numeric("balance_due", { precision: 10, scale: 3 })
      .notNull()
      .default("0"),
    balancePaid: numeric("balance_paid", { precision: 10, scale: 3 })
      .notNull()
      .default("0"),
    completedOrders: integer("completed_orders").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("driver_profiles_user_unique").on(t.userId)],
);

export const driverLedger = pgTable("driver_ledger", {
  id: serial("id").primaryKey(),
  driverUserId: integer("driver_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: integer("order_id"),
  type: text("type").notNull().default("earning"),
  amount: numeric("amount", { precision: 10, scale: 3 })
    .notNull()
    .default("0"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Notifications & settings                                            */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    kind: text("kind").notNull().default("info"),
    orderId: integer("order_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const appSettings = pgTable(
  "app_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull().default(""),
  },
  () => [],
);
