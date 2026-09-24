"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Badge, Btn, Card, Empty, Field, Modal, Spinner, inputCls } from "@/components/ui";
import { useCart } from "@/components/CartProvider";
import { apiGet } from "@/lib/api";
import { CUISINES } from "@/lib/seed-data";
import { money, num } from "@/lib/utils";

type Gov = { id: number; nameAr: string; areas: { id: number; nameAr: string; deliveryFee: string }[] };
type Rest = {
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
  itemCount: number;
  address: string;
};

const NAV: NavItem[] = [
  { href: "/customer", label: "الرئيسية", icon: "🏠" },
  { href: "/customer/orders", label: "طلباتي", icon: "🧾" },
];

export function CustomerHome({ user }: { user: { id: number; fullName: string; email: string; role: string } }) {
  const { cart, count, subtotal } = useCart();
  const [govs, setGovs] = useState<Gov[]>([]);
  const [govId, setGovId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [draftGov, setDraftGov] = useState<number | null>(null);
  const [draftArea, setDraftArea] = useState<number | null>(null);
  const [cuisine, setCuisine] = useState("الكل");
  const [q, setQ] = useState("");
  const [rests, setRests] = useState<Rest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const g = localStorage.getItem("luqma_gov");
    const a = localStorage.getItem("luqma_area");
    if (g) setGovId(Number(g));
    if (a) setAreaId(Number(a));
    apiGet<{ governorates: Gov[] }>("/api/locations").then((d) => {
      setGovs(d.governorates);
      if (!g && d.governorates[0]) {
        setGovId(d.governorates[0].id);
        setDraftGov(d.governorates[0].id);
      }
      if (!a && d.governorates[0]?.areas[0]) {
        setAreaId(d.governorates[0].areas[0].id);
        setDraftArea(d.governorates[0].areas[0].id);
      }
      if (!g || !a) setLocOpen(true);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (govId) params.set("governorateId", String(govId));
      if (areaId) params.set("areaId", String(areaId));
      if (cuisine !== "الكل") params.set("cuisine", cuisine);
      if (q.trim()) params.set("q", q.trim());
      const d = await apiGet<{ restaurants: Rest[] }>(
        `/api/restaurants?${params.toString()}`,
      );
      setRests(d.restaurants);
    } finally {
      setLoading(false);
    }
  }, [govId, areaId, cuisine, q]);

  useEffect(() => {
    if (govId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [govId, areaId, cuisine]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (govId) load();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const govName = govs.find((g) => g.id === govId)?.nameAr ?? "—";
  const areaName = govs
    .find((g) => g.id === govId)
    ?.areas.find((a) => a.id === areaId)?.nameAr ?? "—";

  const draftAreas = useMemo(
    () => govs.find((g) => g.id === draftGov)?.areas ?? [],
    [govs, draftGov],
  );

  const saveLocation = () => {
    if (!draftGov || !draftArea) return;
    setGovId(draftGov);
    setAreaId(draftArea);
    localStorage.setItem("luqma_gov", String(draftGov));
    localStorage.setItem("luqma_area", String(draftArea));
    setLocOpen(false);
  };

  return (
    <AppShell
      user={{ ...user }}
      title={`مرحباً ${user.fullName.split(" ")[0]} 👋`}
      subtitle={`التوصيل إلى: ${govName} — ${areaName}`}
      homeHref="/customer"
      nav={NAV}
    >
      {/* Hero */}
      <section className="lq-gradient relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-black tracking-widest text-gold-300">
            LUQMA · لقمة
          </p>
          <h1 className="mt-2 text-2xl font-black leading-snug text-white sm:text-3xl">
            وش تشتهي اليوم؟
          </h1>
          <p className="mt-1.5 text-xs text-white/60">
            اطلب من أفضل المتاجر في منطقتك وادفع إلكترونياً بأمان
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white/95 px-4 py-3">
              <span className="text-gold-500">🔍</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-brand-950 outline-none placeholder:text-slate-400"
                placeholder="ابحث عن مطعم أو نوع مطبخ..."
              />
            </div>
            <button
              onClick={() => {
                setDraftGov(govId);
                setDraftArea(areaId);
                setLocOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-black text-white backdrop-blur transition hover:bg-white/20"
            >
              📍 {areaName}
            </button>
          </div>
        </div>
      </section>

      {/* Cuisines */}
      <div className="lq-scroll mt-5 flex gap-2 overflow-x-auto pb-1">
        {CUISINES.map((c) => (
          <button
            key={c}
            onClick={() => setCuisine(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
              cuisine === c
                ? "bg-brand-700 text-white shadow-md shadow-brand-700/25"
                : "bg-white text-brand-800 hover:bg-brand-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Restaurants */}
      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-brand-950">
            المتاجر القريبة منك
          </h2>
          <span className="text-[11px] font-bold text-slate-400">
            {rests.length} متجر
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : rests.length === 0 ? (
          <Empty
            icon="📍"
            title="لا توجد متاجر في هذه المنطقة"
            desc="جرّب تغيير المحافظة أو المنطقة"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rests.map((r) => (
              <Link
                key={r.id}
                href={`/customer/r/${r.id}`}
                className="group overflow-hidden rounded-3xl bg-white shadow-lg shadow-brand-900/5 ring-1 ring-brand-100 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="relative h-40 overflow-hidden bg-brand-900">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt={r.nameAr}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl">
                      {r.emoji}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 to-transparent" />
                  {r.discountPercent > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-1 text-[10px] font-black text-brand-950">
                      خصم {r.discountPercent}%
                    </span>
                  )}
                  {r.status === "closed" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-950/70">
                      <span className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-black text-white">
                        مغلق الآن
                      </span>
                    </div>
                  )}
                  {r.status === "busy" && (
                    <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white">
                      ضغط الطلبات
                    </span>
                  )}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-brand-950">
                    ⭐ {r.rating}
                    <span className="font-bold text-slate-400">
                      ({r.ratingCount})
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-brand-950">
                      {r.nameAr}
                    </h3>
                    <Badge tone="brand">{r.cuisine}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {r.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-slate-500">
                    <span>🛵 {money(r.deliveryFee)}</span>
                    <span>⏱ {r.prepMinutes} د</span>
                    <span>🍽 {r.itemCount} صنف</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    حد أدنى {money(r.minOrder)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {count > 0 && cart.restaurantId && (
        <div className="no-print fixed inset-x-0 bottom-[72px] z-[750] mx-auto max-w-6xl px-4 sm:bottom-6">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-800 bg-brand-950 p-3.5 shadow-2xl">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-white/60">
                {cart.restaurantName}
              </p>
              <p className="text-sm font-black text-gold-400">
                {money(subtotal)}
                <span className="mr-2 text-[11px] font-bold text-white/50">
                  {count} صنف
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/customer/r/${cart.restaurantId}`}
                className="rounded-xl border border-white/20 px-3 py-2 text-xs font-black text-white"
              >
                السلة
              </Link>
              <Link
                href="/customer/checkout"
                className="rounded-xl bg-gold-400 px-4 py-2 text-xs font-black text-brand-950"
              >
                إتمام الطلب ←
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Location modal */}
      <Modal
        open={locOpen}
        onClose={() => govId && areaId && setLocOpen(false)}
        title="اختر موقع التوصيل"
        footer={
          <>
            <Btn variant="gold" className="flex-1" onClick={saveLocation}>
              تأكيد الموقع
            </Btn>
            {govId && areaId && (
              <Btn variant="outline" onClick={() => setLocOpen(false)}>
                إغلاق
              </Btn>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <Field label="المحافظة">
            <select
              value={draftGov ?? ""}
              onChange={(e) => {
                setDraftGov(Number(e.target.value));
                setDraftArea(null);
              }}
              className={inputCls}
            >
              {govs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nameAr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المنطقة">
            <select
              value={draftArea ?? ""}
              onChange={(e) => setDraftArea(Number(e.target.value))}
              className={inputCls}
              disabled={!draftGov}
            >
              <option value="">— اختر المنطقة —</option>
              {draftAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nameAr} ({num(a.deliveryFee).toFixed(3)} د.ب)
                </option>
              ))}
            </select>
          </Field>
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700">
            يتم تصفية المتاجر تلقائياً حسب المحافظة والمنطقة المختارة.
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
