"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, Spinner, StatCard, Tabs } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { money, num, ORDER_STATUS, timeAgo } from "@/lib/utils";
import { RestaurantsPanel } from "./RestaurantsPanel";
import { DriversPanel } from "./DriversPanel";
import { PriceRequestsPanel } from "./PriceRequestsPanel";

type Overview = {
  stats: {
    orders: number;
    todayOrders: number;
    delivered: number;
    active: number;
    gmv: number;
    storeCommission: number;
    driverCommission: number;
    netProfit: number;
    restaurants: number;
    openRestaurants: number;
    drivers: number;
    onlineDrivers: number;
    pendingDrivers: number;
    customers: number;
  };
  recentOrders: {
    id: number;
    code: string;
    status: string;
    total: string;
    placedAt: string;
    restaurantId: number;
  }[];
  pendingPrices: { id: number }[];
};

export function AdminDashboard({
  user,
}: {
  user: { id: number; fullName: string; email: string; role: string };
}) {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await apiGet<Overview>("/api/admin"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  if (loading || !data)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const s = data.stats;

  return (
    <AppShell
      user={user}
      title="مركز تحكم لقمة"
      subtitle="صلاحيات كاملة على المنصة"
      homeHref="/admin"
      right={
        <span className="hidden rounded-xl bg-gold-400/20 px-3 py-2 text-[11px] font-black text-gold-300 sm:inline">
          👑 Super Admin
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={String(s.orders)} hint={`اليوم ${s.todayOrders} · نشط ${s.active}`} tone="brand" icon="🧾" />
        <StatCard label="إجمالي المبيعات GMV" value={money(s.gmv)} hint={`مسلّم ${s.delivered}`} tone="gold" icon="💰" />
        <StatCard label="إيراد العمولات" value={money(s.netProfit)} hint={`متاجر ${money(s.storeCommission)} · توصيل ${money(s.driverCommission)}`} tone="green" icon="🏷️" />
        <StatCard label="المستخدمون" value={String(s.customers)} hint={`متاجر ${s.restaurants} · مناديب ${s.drivers}`} tone="blue" icon="👥" />
      </div>

      <div className="mt-5">
        <Tabs
          tabs={[
            { key: "overview", label: "نظرة عامة", icon: "📊" },
            { key: "restaurants", label: "المتاجر والقوائم", icon: "🏪", badge: s.restaurants },
            { key: "drivers", label: "المناديب", icon: "🛵", badge: s.pendingDrivers },
            { key: "prices", label: "طلبات الأسعار", icon: "💲", badge: data.pendingPrices.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-4">
        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <h3 className="text-sm font-black text-brand-950">
                    أحدث الطلبات
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {data.recentOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-xs font-black text-brand-950" dir="ltr">
                          {o.code}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {timeAgo(o.placedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={ORDER_STATUS[o.status]?.tone ?? "brand"}>
                          {ORDER_STATUS[o.status]?.label ?? o.status}
                        </Badge>
                        <span className="text-xs font-black">{money(o.total)}</span>
                      </div>
                    </div>
                  ))}
                  {data.recentOrders.length === 0 && (
                    <p className="px-5 py-8 text-center text-xs text-slate-400">
                      لا توجد طلبات بعد
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-black text-brand-950">
                  الإعدادات المالية الافتراضية
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
                    <span className="font-semibold text-brand-800">
                      عمولة المتجر الثابتة
                    </span>
                    <span className="font-black">0.500 د.ب / طلب</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gold-50 px-3 py-2.5">
                    <span className="font-semibold text-gold-700">
                      عمولة التوصيل
                    </span>
                    <span className="font-black">10% من رسوم التوصيل</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    يمكن تخصيص كل قيمة لكل متجر أو مندوب على حدة من تبويب
                    المتاجر / المناديب.
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-black text-brand-950">
                  حالة المنصة
                </h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["متاجر مفتوحة", `${s.openRestaurants} / ${s.restaurants}`],
                    ["مناديب متصلون", `${s.onlineDrivers} / ${s.drivers}`],
                    ["طلبات اعتماد مناديب", String(s.pendingDrivers)],
                    ["طلبات أسعار معلقة", String(data.pendingPrices.length)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-black text-brand-900">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "restaurants" && <RestaurantsPanel onChanged={load} />}
        {tab === "drivers" && <DriversPanel onChanged={load} />}
        {tab === "prices" && <PriceRequestsPanel onChanged={load} />}
      </div>
    </AppShell>
  );
}

export function fmt(n: unknown) {
  return num(n).toFixed(3);
}
