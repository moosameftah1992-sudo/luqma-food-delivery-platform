"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge, Btn, Card, Empty, Modal, Spinner } from "@/components/ui";
import { useCart } from "@/components/CartProvider";
import { apiGet } from "@/lib/api";
import { money, num } from "@/lib/utils";

type Addon = { id: number; nameAr: string; price: string; isAvailable: boolean };
type Group = {
  id: number;
  nameAr: string;
  selectionType: string;
  required: boolean;
  addons: Addon[];
};
type Item = {
  id: number;
  nameAr: string;
  description: string;
  emoji: string;
  imageUrl: string | null;
  price: string;
  isAvailable: boolean;
  discountPercent: number;
  sizes: { id: number; nameAr: string; price: string }[];
  groups: Group[];
};
type Cat = { id: number; nameAr: string; items: Item[] };

export function RestaurantView({
  restaurantId,
  user,
}: {
  restaurantId: number;
  user: { id: number; fullName: string; email: string; role: string };
}) {
  const { cart, addLine, count, subtotal } = useCart();
  const [data, setData] = useState<{
    restaurant: {
      id: number;
      nameAr: string;
      cuisine: string;
      description: string;
      imageUrl: string | null;
      emoji: string;
      status: string;
      rating: string;
      ratingCount: number;
      minOrder: string;
      deliveryFee: string;
      prepMinutes: number;
      discountPercent: number;
      address: string;
      phone: string;
    };
    categories: Cat[];
    reviews: {
      id: number;
      rating: number;
      comment: string;
      createdAt: string;
      customerName: string;
    }[];
  } | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<NonNullable<typeof data>>(
        `/api/restaurants/${restaurantId}`,
      );
      setData(d);
      setActive(d.categories[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const openItem = (it: Item) => {
    setItem(it);
    setSizeId(it.sizes[0]?.id ?? null);
    setPicked({});
    setQty(1);
    setNotes("");
  };

  const unitPrice = () => {
    if (!item) return 0;
    const size = item.sizes.find((s) => s.id === sizeId);
    const addonsTotal = Object.entries(picked).reduce((sum, [gid, ids]) => {
      const g = item.groups.find((x) => x.id === Number(gid));
      return (
        sum +
        (g?.addons
          .filter((a) => ids.includes(a.id))
          .reduce((s, a) => s + num(a.price), 0) ?? 0)
      );
    }, 0);
    return num(size ? size.price : item.price) + addonsTotal;
  };

  const addToCart = () => {
    if (!item || !data) return;
    const size = item.sizes.find((s) => s.id === sizeId);
    const chosen = Object.entries(picked).flatMap(([gid, ids]) => {
      const g = item.groups.find((x) => x.id === Number(gid));
      return (
        g?.addons
          .filter((a) => ids.includes(a.id))
          .map((a) => ({ id: a.id, nameAr: a.nameAr, price: num(a.price) })) ?? []
      );
    });
    addLine({
      restaurantId: data.restaurant.id,
      restaurantName: data.restaurant.nameAr,
      itemId: item.id,
      nameAr: item.nameAr,
      emoji: item.emoji,
      sizeId: size?.id ?? null,
      sizeName: size?.nameAr ?? null,
      unitPrice: num(size ? size.price : item.price),
      addons: chosen,
      notes,
      quantity: qty,
    });
    setItem(null);
  };

  const toggleAddon = (groupId: number, addonId: number, type: string) => {
    setPicked((prev) => {
      const cur = prev[groupId] ?? [];
      if (type === "single") return { ...prev, [groupId]: [addonId] };
      return {
        ...prev,
        [groupId]: cur.includes(addonId)
          ? cur.filter((x) => x !== addonId)
          : [...cur, addonId],
      };
    });
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  if (!data)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Empty title="المتجر غير موجود" />
      </div>
    );

  const r = data.restaurant;
  const cats = data.categories;

  return (
    <AppShell
      user={user}
      title={r.nameAr}
      subtitle={`${r.cuisine} · ⭐ ${num(r.rating).toFixed(1)} · 🛵 ${money(r.deliveryFee)}`}
      homeHref="/customer"
    >
      <Link
        href="/customer"
        className="mb-3 inline-flex items-center gap-1 text-xs font-black text-brand-700"
      >
        → العودة للمتاجر
      </Link>

      {/* Cover */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="relative h-44 bg-brand-900 sm:h-56">
          {r.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.imageUrl} alt={r.nameAr} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">
              {r.emoji}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-transparent" />
        </div>
        <div className="lq-gradient p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-white">{r.nameAr}</h1>
              <p className="mt-1 text-[11px] text-white/60">{r.address}</p>
              <p className="mt-0.5 text-[11px] text-white/60" dir="ltr">
                {r.phone}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={r.status === "open" ? "green" : r.status === "busy" ? "amber" : "red"}>
                {r.status === "open" ? "مفتوح" : r.status === "busy" ? "ضغط" : "مغلق"}
              </Badge>
              <Badge tone="gold">⭐ {num(r.rating).toFixed(1)}</Badge>
              {r.discountPercent > 0 && (
                <Badge tone="gold">خصم {r.discountPercent}%</Badge>
              )}
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/70">
            {r.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-bold text-white/70">
            <span>🛵 توصيل {money(r.deliveryFee)}</span>
            <span>⏱ تحضير {r.prepMinutes} دقيقة</span>
            <span>🛍 حد أدنى {money(r.minOrder)}</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="sticky top-[62px] z-30 -mx-4 mt-4 border-b border-brand-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="lq-scroll flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActive(c.id);
                document.getElementById(`cat-${c.id}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                active === c.id
                  ? "bg-brand-700 text-white"
                  : "bg-brand-50 text-brand-800"
              }`}
            >
              {c.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="mt-4 space-y-6">
        {cats.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-40">
            <h2 className="mb-3 flex items-center gap-2 text-base font-black text-brand-950">
              <span className="h-5 w-1 rounded-full bg-gold-400" />
              {c.nameAr}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.items.map((it) => {
                const price = num(it.price);
                const disc = Math.max(it.discountPercent, r.discountPercent);
                return (
                  <Card
                    key={it.id}
                    className={`flex gap-3 p-3.5 transition ${
                      it.isAvailable ? "hover:shadow-xl" : "opacity-55"
                    }`}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-3xl">
                      {it.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-black text-brand-950">
                          {it.nameAr}
                        </h3>
                        {disc > 0 && (
                          <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-black text-gold-700">
                            -{disc}%
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                        {it.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-brand-800">
                            {money(price)}
                          </span>
                          {it.sizes.length > 0 && (
                            <span className="mr-1 text-[10px] text-slate-400">
                              · {it.sizes.length} أحجام
                            </span>
                          )}
                          {it.groups.length > 0 && (
                            <span className="mr-1 text-[10px] text-slate-400">
                              · إضافات
                            </span>
                          )}
                        </div>
                        <button
                          disabled={!it.isAvailable}
                          onClick={() => openItem(it)}
                          className="rounded-xl bg-brand-700 px-3.5 py-1.5 text-[11px] font-black text-white transition hover:bg-brand-800 disabled:bg-slate-300"
                        >
                          {it.isAvailable ? "إضافة" : "غير متوفر"}
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Reviews */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-black text-brand-950">
          تقييمات العملاء ({data.reviews.length})
        </h2>
        {data.reviews.length === 0 ? (
          <Empty icon="⭐" title="لا توجد تقييمات بعد" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.reviews.map((rev) => (
              <Card key={rev.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-brand-950">
                    {rev.customerName}
                  </p>
                  <span className="text-xs text-gold-500">
                    {"★".repeat(rev.rating)}
                    <span className="text-slate-300">
                      {"★".repeat(5 - rev.rating)}
                    </span>
                  </span>
                </div>
                {rev.comment && (
                  <p className="mt-2 text-[11px] text-slate-500">{rev.comment}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Item modal */}
      <Modal
        open={!!item}
        onClose={() => setItem(null)}
        title={item?.nameAr ?? ""}
        footer={
          <div className="flex w-full items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-2">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-2 py-1 text-lg font-black text-brand-700"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-black">{qty}</span>
              <button
                onClick={() => setQty(Math.min(20, qty + 1))}
                className="px-2 py-1 text-lg font-black text-brand-700"
              >
                +
              </button>
            </div>
            <Btn variant="gold" className="flex-1" onClick={addToCart}>
              أضف للسلة · {money(unitPrice() * qty)}
            </Btn>
          </div>
        }
      >
        {item && (
          <div className="space-y-4">
            <p className="text-[12px] text-slate-500">{item.description}</p>

            {item.sizes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-black text-brand-900">الحجم</p>
                <div className="space-y-2">
                  {item.sizes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSizeId(s.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                        sizeId === s.id
                          ? "border-brand-600 bg-brand-50 text-brand-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-4 w-4 rounded-full border-2 ${
                            sizeId === s.id
                              ? "border-brand-700 bg-brand-700 ring-2 ring-brand-200"
                              : "border-slate-300"
                          }`}
                        />
                        {s.nameAr}
                      </span>
                      <span>{money(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.groups.map((g) => (
              <div key={g.id}>
                <p className="mb-2 flex items-center justify-between text-xs font-black text-brand-900">
                  <span>{g.nameAr}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {g.selectionType === "single" ? "اختيار واحد" : "اختيار متعدد"}
                  </span>
                </p>
                <div className="space-y-2">
                  {g.addons.map((a) => {
                    const on = (picked[g.id] ?? []).includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAddon(g.id, a.id, g.selectionType)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                          on
                            ? "border-brand-600 bg-brand-50 text-brand-900"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center border-2 text-[9px] ${
                              g.selectionType === "single"
                                ? "rounded-full"
                                : "rounded"
                            } ${
                              on
                                ? "border-brand-700 bg-brand-700 text-white"
                                : "border-slate-300"
                            }`}
                          >
                            ✓
                          </span>
                          {a.nameAr}
                        </span>
                        <span>{num(a.price) > 0 ? `+${money(a.price)}` : "مجاناً"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <p className="mb-2 text-xs font-black text-brand-900">
                ملاحظات للمتجر (اختياري)
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-400"
                placeholder="مثال: بدون بصل، حار..."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Cart bar */}
      {count > 0 && cart.restaurantId === restaurantId && (
        <div className="no-print fixed inset-x-0 bottom-[72px] z-[750] mx-auto max-w-6xl px-4 sm:bottom-6">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-800 bg-brand-950 p-3.5 shadow-2xl">
            <div>
              <p className="text-[11px] font-bold text-white/60">
                {cart.restaurantName}
              </p>
              <p className="text-sm font-black text-gold-400">
                {money(subtotal)}
                <span className="mr-2 text-[11px] font-bold text-white/50">
                  {count} صنف
                </span>
              </p>
            </div>
            <Link
              href="/customer/checkout"
              className="rounded-xl bg-gold-400 px-5 py-2.5 text-xs font-black text-brand-950"
            >
              إتمام الطلب ←
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
