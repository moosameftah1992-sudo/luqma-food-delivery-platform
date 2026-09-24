"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Btn, Card, Empty, Spinner, StatCard, Tabs } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { money, num, timeAgo } from "@/lib/utils";
import { OrdersPanel } from "./OrdersPanel";
import { MenuPanel } from "./MenuPanel";
import { ReportsPanel } from "./ReportsPanel";

export type StoreUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  restaurantName?: string | null;
};

export function StoreDashboard({ user }: { user: StoreUser }) {
  const { notify } = useToast();
  const [tab, setTab] = useState("orders");
  const [data, setData] = useState<{
    restaurant: {
      id: number;
      nameAr: string;
      status: string;
      description: string;
      address: string;
      phone: string;
      prepMinutes: number;
      discountPercent: number;
      commissionPerOrder: string;
      rating: string;
      minOrder: string;
      deliveryFee: string;
    };
    stats: Record<string, number>;
    pendingPrices: { id: number; itemName: string; oldPrice: string; newPrice: string; status: string; createdAt: string }[];
  } | null>(null);

  const load = useCallback(async () => {
    const d = await apiGet<NonNullable<typeof data>>("/api/store");
    setData(d);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const setStatus = async (status: string) => {
    await apiPatch("/api/store", { status });
    notify({
      title:
        status === "open"
          ? "المتجر مفتوح الآن 🟢"
          : status === "busy"
            ? "الحالة: ضغط الطلبات 🟡"
            : "المتجر مغلق 🔴",
      kind: "info",
    });
    load();
  };

  if (!data)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const s = data.stats;
  const pendingCount = num(s.pendingCount);

  return (
    <AppShell
      user={user}
      title={`${data.restaurant.nameAr}`}
      subtitle="لوحة إدارة المتجر"
      homeHref="/store"
      right={
        <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
          {[
            { k: "open", l: "مفتوح", c: "bg-emerald-500" },
            { k: "busy", l: "ضغط", c: "bg-amber-500" },
            { k: "closed", l: "مغلق", c: "bg-red-500" },
          ].map((st) => (
            <button
              key={st.k}
              onClick={() => setStatus(st.k)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${
                data.restaurant.status === st.k
                  ? `${st.c} text-white`
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              {st.l}
            </button>
          ))}
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="طلبات اليوم"
          value={String(num(s.todayOrders))}
          hint={`مبيعات ${money(s.todaySales)}`}
          tone="brand"
          icon="🧾"
        />
        <StatCard
          label="إجمالي الطلبات"
          value={String(num(s.totalOrders))}
          hint={`مسلّم ${num(s.deliveredOrders)}`}
          tone="blue"
          icon="📦"
        />
        <StatCard
          label="إجمالي المبيعات"
          value={money(s.totalSales)}
          hint={`متوسط الطلب ${money(s.avgOrder)}`}
          tone="gold"
          icon="💰"
        />
        <StatCard
          label="عمولة لقمة"
          value={money(s.commission)}
          hint={`${money(data.restaurant.commissionPerOrder)} لكل طلب`}
          tone="green"
          icon="🏷️"
        />
      </div>

      <div className="mt-5">
        <Tabs
          tabs={[
            { key: "orders", label: "الطلبات", icon: "🔔", badge: pendingCount },
            { key: "menu", label: "القائمة والأصناف", icon: "🍽️" },
            {
              key: "requests",
              label: "طلبات الأسعار",
              icon: "💲",
              badge: data.pendingPrices.length,
            },
            { key: "reports", label: "التقارير المالية", icon: "📊" },
            { key: "settings", label: "إعدادات المتجر", icon: "⚙️" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-4">
        {tab === "orders" && <OrdersPanel onChanged={load} />}
        {tab === "menu" && <MenuPanel />}
        {tab === "requests" && (
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-black text-brand-950">
              طلبات تعديل الأسعار المرسلة للإدارة
            </h3>
            {data.pendingPrices.length === 0 ? (
              <Empty icon="✅" title="لا توجد طلبات معلقة" />
            ) : (
              <div className="space-y-2">
                {data.pendingPrices.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs font-black text-brand-950">{p.itemName}</p>
                      <p className="text-[11px] text-slate-500">
                        {money(p.oldPrice)} ← {money(p.newPrice)} · {timeAgo(p.createdAt)}
                      </p>
                    </div>
                    <Btn variant="ghost" className="py-1.5 text-[11px]">
                      بانتظار موافقة الأدمن
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        {tab === "reports" && <ReportsPanel />}
        {tab === "settings" && (
          <StoreSettings
            restaurant={data.restaurant}
            onSaved={load}
          />
        )}
      </div>
    </AppShell>
  );
}

function StoreSettings({
  restaurant,
  onSaved,
}: {
  restaurant: {
    id: number;
    description: string;
    address: string;
    phone: string;
    prepMinutes: number;
    discountPercent: number;
    commissionPerOrder: string;
  };
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [description, setDescription] = useState(restaurant.description);
  const [address, setAddress] = useState(restaurant.address);
  const [phone, setPhone] = useState(restaurant.phone);
  const [prep, setPrep] = useState(restaurant.prepMinutes);
  const [discount, setDiscount] = useState(restaurant.discountPercent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(restaurant.description);
    setAddress(restaurant.address);
    setPhone(restaurant.phone);
    setPrep(restaurant.prepMinutes);
    setDiscount(restaurant.discountPercent);
  }, [restaurant]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/store", {
        description,
        address,
        phone,
        prepMinutes: prep,
        discountPercent: discount,
      });
      notify({ title: "تم حفظ الإعدادات ✅", kind: "success" });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-black text-brand-950">بيانات المتجر</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-brand-800">
              الوصف
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-brand-800">
              العنوان
            </span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-brand-800">
              الهاتف
            </span>
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-brand-800">
              مدة التحضير (دقيقة)
            </span>
            <input
              type="number"
              value={prep}
              onChange={(e) => setPrep(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-black text-brand-950">
          الخصومات والعروض
        </h3>
        <p className="mb-4 text-[11px] text-slate-500">
          الخصم المئوي يُطبّق على كامل سلة العميل من متجرك.
        </p>
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-full accent-brand-700"
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">نسبة الخصم</span>
            <span className="rounded-lg bg-gold-100 px-2.5 py-1 text-sm font-black text-gold-700">
              {discount}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 10, 15, 25].map((d) => (
            <button
              key={d}
              onClick={() => setDiscount(d)}
              className={`rounded-xl border px-2 py-2 text-xs font-black transition ${
                discount === d
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {d === 0 ? "بدون" : `${d}%`}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-brand-50 p-4">
          <p className="text-[11px] font-bold text-brand-700">
            عمولة لقمة الثابتة:
            <span className="mx-1 font-black">
              {money(restaurant.commissionPerOrder)}
            </span>
            لكل طلب مُسلّم (تُحدد من الإدارة).
          </p>
        </div>

        <Btn variant="gold" className="mt-5 w-full" onClick={save} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Btn>
      </Card>
    </div>
  );
}
