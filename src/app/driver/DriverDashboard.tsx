"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, useNewOrderAlarm } from "@/components/AppShell";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  Modal,
  Spinner,
  StatCard,
  Tabs,
  Toggle,
  inputCls,
} from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime, money, num, ORDER_STATUS, timeAgo } from "@/lib/utils";

type Order = {
  id: number;
  code: string;
  status: string;
  deliveryFee: string;
  driverCommission: string;
  total: string;
  addressText: string;
  notes: string;
  restaurantName: string;
  restaurantEmoji: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  placedAt: string;
  items: { id: number; nameAr: string; quantity: number; sizeName: string | null }[];
};

type Profile = {
  id: number;
  userId: number;
  nationalId: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  status: string;
  isOnline: boolean;
  commissionRate: string;
  balanceDue: string;
  balancePaid: string;
  completedOrders: number;
};

const CANCEL_REASONS = [
  "تعذر الوصول للعميل",
  "عنوان غير صحيح",
  "عطل في المركبة",
  "العميل غير متاح / لا يرد",
  "حالة طارئة",
  "أخرى",
];

export function DriverDashboard({
  user,
}: {
  user: { id: number; fullName: string; email: string; role: string };
}) {
  const { notify } = useToast();
  const [tab, setTab] = useState("available");
  const [active, setActive] = useState<Order[]>([]);
  const [available, setAvailable] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{
    completed: number;
    todayCompleted: number;
    grossFees: number;
    commission: number;
    net: number;
    balanceDue: number;
    balancePaid: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [cancelFor, setCancelFor] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const d = await apiGet<{
        active: Order[];
        available: Order[];
        history: Order[];
        online: boolean;
      }>("/api/orders");
      setActive(d.active);
      setAvailable(d.available);
      setHistory(d.history);
      setOnline(d.online);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const d = await apiGet<{ profile: Profile; stats: NonNullable<typeof stats> }>(
      "/api/driver/profile",
    );
    setProfile(d.profile);
    setStats(d.stats);
  }, []);

  useEffect(() => {
    loadOrders();
    loadProfile();
    const id = setInterval(loadOrders, 4000);
    return () => clearInterval(id);
  }, [loadOrders, loadProfile]);

  const availIds = available.map((o) => o.id);
  useNewOrderAlarm(availIds, (id) => {
    const o = available.find((x) => x.id === id);
    return `${o?.restaurantName ?? ""} · ${money(o?.deliveryFee ?? 0)}`;
  });

  const toggleOnline = async (v: boolean) => {
    await apiPatch("/api/driver/profile", { isOnline: v });
    setOnline(v);
    notify({
      title: v ? "أنت الآن متصل 🟢" : "أنت الآن غير متصل ⚪",
      body: v ? "ستصلك الطلبات المتاحة فوراً" : "لن تصلك طلبات جديدة",
      kind: "info",
    });
    loadOrders();
  };

  const act = async (order: Order, action: string, reasonText?: string) => {
    setBusy(order.id);
    try {
      await apiPatch(`/api/orders/${order.id}`, { action, reason: reasonText });
      if (action === "accept_delivery")
        notify({ title: `تم قبول الطلب ${order.code} 🛵`, kind: "success" });
      if (action === "delivered")
        notify({ title: `تم تسليم الطلب ${order.code} 🎉`, kind: "success" });
      if (action === "driver_cancel")
        notify({ title: "تم إلغاء التوصيل وإعادة الطلب للتوزيع", kind: "info" });
      loadOrders();
      loadProfile();
    } catch (e) {
      notify({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(null);
    }
  };

  if (loading || !profile || !stats)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  return (
    <AppShell
      user={user}
      title="لوحة المندوب"
      subtitle={`${profile.vehicleType} · عمولة ${num(profile.commissionRate)}%`}
      homeHref="/driver"
      right={
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
            online ? "bg-emerald-500/20" : "bg-white/10"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-400"}`}
          />
          <span className="text-[11px] font-black text-white">
            {online ? "أونلاين" : "أوفلاين"}
          </span>
        </div>
      }
    >
      {/* Online toggle + stats */}
      <Card
        className={`mb-4 flex flex-wrap items-center justify-between gap-4 p-5 ${
          online ? "ring-2 ring-emerald-300" : ""
        }`}
      >
        <div>
          <p className="text-sm font-black text-brand-950">
            {online ? "أنت متصل وتستقبل الطلبات 🟢" : "أنت غير متصل حالياً ⚪"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {online
              ? "الطلبات المتاحة تظهر فوراً مع تنبيه صوتي — من يضغط أولاً يأخذ الطلب"
              : "فعّل الاتصال لبدء استقبال الطلبات المتاحة"}
          </p>
        </div>
        <Toggle checked={online} onChange={toggleOnline} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="طلبات مكتملة"
          value={String(stats.completed)}
          hint={`اليوم ${stats.todayCompleted}`}
          tone="brand"
          icon="📦"
        />
        <StatCard
          label="إجمالي رسوم التوصيل"
          value={money(stats.grossFees)}
          hint={`عمولة ${money(stats.commission)}`}
          tone="gold"
          icon="🛵"
        />
        <StatCard
          label="صافي الأرباح"
          value={money(stats.net)}
          hint="بعد خصم عمولة لقمة"
          tone="green"
          icon="💰"
        />
        <StatCard
          label="المستحق لك"
          value={money(stats.balanceDue)}
          hint={`تم دفع ${money(stats.balancePaid)}`}
          tone="blue"
          icon="🧮"
        />
      </div>

      <div className="mt-5">
        <Tabs
          tabs={[
            { key: "available", label: "الطلبات المتاحة", icon: "🔔", badge: available.length },
            { key: "mine", label: "طلباتي", icon: "🛵", badge: active.length },
            { key: "earnings", label: "كشف الحساب", icon: "💵" },
            { key: "profile", label: "بياناتي", icon: "👤" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-4">
        {tab === "available" && (
          <div className="grid gap-3 lg:grid-cols-2">
            {!online && (
              <Card className="p-6 text-center lg:col-span-2">
                <p className="text-3xl">⚪</p>
                <p className="mt-2 text-sm font-black text-brand-950">
                  قم بتفعيل الاتصال لعرض الطلبات المتاحة
                </p>
              </Card>
            )}
            {online && available.length === 0 && (
              <div className="lg:col-span-2">
                <Empty icon="⏳" title="لا توجد طلبات متاحة حالياً" desc="سيظهر الطلب هنا فور تجهيزه من المتجر" />
              </div>
            )}
            {online &&
              available.map((o) => (
                <Card key={o.id} className="animate-lq-pop overflow-hidden ring-2 ring-gold-300">
                  <div className="flex items-center justify-between border-b border-gold-100 bg-gold-50 px-4 py-2.5">
                    <span className="text-sm font-black text-brand-950" dir="ltr">
                      {o.code}
                    </span>
                    <Badge tone="gold">جاهز للاستلام</Badge>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{o.restaurantEmoji}</span>
                      <div>
                        <p className="text-sm font-black text-brand-950">
                          {o.restaurantName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {timeAgo(o.placedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-[11px]">
                      <p className="font-bold text-brand-800">
                        📍 التوصيل إلى: {o.addressText}
                      </p>
                      <p className="text-slate-500">
                        {o.items.length} أصناف · إجمالي الطلب {money(o.total)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-500">رسوم التوصيل</p>
                        <p className="text-lg font-black text-gold-600">
                          {money(o.deliveryFee)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          عمولة {num(profile.commissionRate)}% ={" "}
                          {money(
                            (num(o.deliveryFee) * num(profile.commissionRate)) / 100,
                          )}
                        </p>
                      </div>
                      <Btn
                        variant="gold"
                        className="px-6 py-3"
                        disabled={busy === o.id}
                        onClick={() => act(o, "accept_delivery")}
                      >
                        {busy === o.id ? "..." : "اقبل الطلب"}
                      </Btn>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {tab === "mine" && (
          <div className="grid gap-3 lg:grid-cols-2">
            {active.length === 0 && (
              <div className="lg:col-span-2">
                <Empty icon="🛵" title="لا توجد طلبات نشطة" desc="اقبل طلباً من تبويب الطلبات المتاحة" />
              </div>
            )}
            {active.map((o) => (
              <Card key={o.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="text-sm font-black text-brand-950" dir="ltr">
                    {o.code}
                  </span>
                  <Badge tone={ORDER_STATUS[o.status]?.tone ?? "brand"}>
                    {ORDER_STATUS[o.status]?.label ?? o.status}
                  </Badge>
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-sm font-black text-brand-950">
                    {o.restaurantEmoji} {o.restaurantName}
                  </p>
                  <p className="rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-800">
                    📍 {o.addressText}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      أرباحك:{" "}
                      <b className="text-gold-600">
                        {money(num(o.deliveryFee) - num(o.driverCommission))}
                      </b>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(o.placedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {o.status === "assigned" && (
                      <Btn
                        variant="primary"
                        className="flex-1 py-2 text-xs"
                        disabled={busy === o.id}
                        onClick={() => act(o, "picked_up")}
                      >
                        استلمت الطلب من المتجر
                      </Btn>
                    )}
                    {o.status === "picked_up" && (
                      <Btn
                        variant="primary"
                        className="flex-1 py-2 text-xs"
                        disabled={busy === o.id}
                        onClick={() => act(o, "on_the_way")}
                      >
                        في الطريق إلى العميل
                      </Btn>
                    )}
                    {["picked_up", "on_the_way"].includes(o.status) && (
                      <Btn
                        variant="gold"
                        className="flex-1 py-2 text-xs"
                        disabled={busy === o.id}
                        onClick={() => act(o, "delivered")}
                      >
                        ✅ تم التسليم
                      </Btn>
                    )}
                    <Btn
                      variant="outline"
                      className="py-2 text-xs"
                      onClick={() => {
                        setReason("");
                        setCancelFor(o);
                      }}
                    >
                      إلغاء
                    </Btn>
                  </div>
                </div>
              </Card>
            ))}

            {history.length > 0 && (
              <div className="lg:col-span-2">
                <h3 className="mb-2 text-sm font-black text-brand-950">
                  آخر الطلبات المكتملة
                </h3>
                <Card className="overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-right text-[11px] text-slate-500">
                        <th className="py-2 pr-3">الطلب</th>
                        <th className="py-2">المتجر</th>
                        <th className="py-2">الحالة</th>
                        <th className="py-2">رسوم التوصيل</th>
                        <th className="py-2">صافيك</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 12).map((o) => (
                        <tr key={o.id} className="border-b border-slate-50">
                          <td className="py-2 pr-3 font-black" dir="ltr">
                            {o.code}
                          </td>
                          <td className="py-2">{o.restaurantName}</td>
                          <td className="py-2">
                            <Badge tone={ORDER_STATUS[o.status]?.tone ?? "brand"}>
                              {ORDER_STATUS[o.status]?.label}
                            </Badge>
                          </td>
                          <td className="py-2">{money(o.deliveryFee)}</td>
                          <td className="py-2 font-black text-gold-600">
                            {money(num(o.deliveryFee) - num(o.driverCommission))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}
          </div>
        )}

        {tab === "earnings" && <EarningsPanel />}
        {tab === "profile" && (
          <DriverProfilePanel profile={profile} onSaved={loadProfile} />
        )}
      </div>

      <Modal
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        title="إلغاء التوصيل"
        footer={
          <>
            <Btn
              variant="danger"
              className="flex-1"
              disabled={!reason.trim()}
              onClick={() => {
                const o = cancelFor!;
                setCancelFor(null);
                act(o, "driver_cancel", reason);
              }}
            >
              تأكيد الإلغاء
            </Btn>
            <Btn variant="outline" onClick={() => setCancelFor(null)}>
              رجوع
            </Btn>
          </>
        }
      >
        <p className="mb-3 text-sm text-brand-800">
          سيتم إعادة الطلب <b dir="ltr">{cancelFor?.code}</b> إلى لوحة الطلبات
          المتاحة لباقي المندوبين. سبب الإلغاء إلزامي.
        </p>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                reason === r
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className={inputCls}
          placeholder="اكتب السبب..."
        />
      </Modal>
    </AppShell>
  );
}

function EarningsPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{
    summary: { delivered: number; cancelled: number; fees: number; commission: number; net: number; paid: number };
    rows: { id: number; code: string; deliveryFee: string; driverCommission: string; net: number; status: string; deliveredAt: string | null; placedAt: string; restaurantName: string }[];
    daily: { date: string; orders: number; fees: number; net: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      setData(await apiGet<NonNullable<typeof data>>(`/api/driver/earnings?${p}`));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const head = ["الطلب", "المتجر", "الحالة", "التاريخ", "رسوم التوصيل", "العمولة", "الصافي"];
    const lines = data.rows.map((r) => [
      r.code,
      r.restaurantName,
      ORDER_STATUS[r.status]?.label ?? r.status,
      new Date(r.deliveredAt ?? r.placedAt).toLocaleString("ar"),
      num(r.deliveryFee).toFixed(3),
      num(r.driverCommission).toFixed(3),
      r.net.toFixed(3),
    ]);
    const csv = [head, ...lines].map((l) => l.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "luqma-driver-earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="من تاريخ">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="إلى تاريخ">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="flex-1" />
        <Btn variant="primary" onClick={exportCsv}>
          ⬇ تصدير Excel
        </Btn>
        <Btn variant="dark" onClick={() => window.print()}>
          🖨 PDF
        </Btn>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="طلبات مسلّمة" value={String(data.summary.delivered)} hint={`ملغي ${data.summary.cancelled}`} tone="brand" icon="📦" />
        <StatCard label="رسوم التوصيل" value={money(data.summary.fees)} tone="gold" icon="🛵" />
        <StatCard label="عمولة لقمة" value={money(data.summary.commission)} tone="red" icon="🏷️" />
        <StatCard label="صافي المستحق" value={money(data.summary.net)} hint={`مدفوع ${money(data.summary.paid)}`} tone="green" icon="💰" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto lq-scroll">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-right text-[11px] text-slate-500">
                <th className="py-2.5 pr-4">الطلب</th>
                <th className="py-2.5">المتجر</th>
                <th className="py-2.5">التاريخ</th>
                <th className="py-2.5">رسوم التوصيل</th>
                <th className="py-2.5">العمولة</th>
                <th className="py-2.5 pl-4">الصافي</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2.5 pr-4 font-black" dir="ltr">
                    {r.code}
                  </td>
                  <td className="py-2.5">{r.restaurantName}</td>
                  <td className="py-2.5">{formatDateTime(r.deliveredAt ?? r.placedAt)}</td>
                  <td className="py-2.5">{money(r.deliveryFee)}</td>
                  <td className="py-2.5 text-red-500">
                    -{money(r.driverCommission)}
                  </td>
                  <td className="py-2.5 pl-4 font-black text-gold-600">
                    {money(r.net)}
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد عمليات في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DriverProfilePanel({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [vehicleType, setVehicleType] = useState(profile.vehicleType);
  const [vehiclePlate, setVehiclePlate] = useState(profile.vehiclePlate);

  const save = async () => {
    await apiPatch("/api/driver/profile", { vehicleType, vehiclePlate });
    notify({ title: "تم حفظ البيانات ✅", kind: "success", silent: true });
    onSaved();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-black text-brand-950">بيانات الحساب</h3>
        <dl className="space-y-3 text-xs">
          {[
            ["رقم بطاقة الهوية", profile.nationalId],
            ["رقم رخصة القيادة", profile.licenseNumber],
            ["حالة الحساب", profile.status === "active" ? "مفعّل ✅" : profile.status],
            ["نسبة عمولة لقمة", `${num(profile.commissionRate)}% من رسوم التوصيل`],
            ["الطلبات المكتملة", String(profile.completedOrders)],
            ["الرصيد المستحق", `${num(profile.balanceDue).toFixed(3)} د.ب`],
            ["إجمالي المدفوع", `${num(profile.balancePaid).toFixed(3)} د.ب`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-slate-50 pb-2">
              <dt className="font-semibold text-slate-500">{k}</dt>
              <dd className="font-black text-brand-900" dir="ltr">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-black text-brand-950">بيانات المركبة</h3>
        <div className="space-y-3">
          <Field label="نوع المركبة">
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className={inputCls}
            >
              <option>دراجة نارية</option>
              <option>سيارة</option>
              <option>ونيت</option>
              <option>دراجة هوائية</option>
            </select>
          </Field>
          <Field label="رقم اللوحة">
            <input
              dir="ltr"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className={`${inputCls} text-left`}
            />
          </Field>
          <Btn variant="gold" className="w-full" onClick={save}>
            حفظ البيانات
          </Btn>
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-brand-700">
            يتم تحويل المستحقات من قبل الإدارة، ويمكنك متابعتها من تبويب كشف
            الحساب.
          </p>
        </div>
      </Card>
    </div>
  );
}
