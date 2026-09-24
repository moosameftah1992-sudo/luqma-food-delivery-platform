"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Card, Field, Spinner, StatCard, inputCls } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime, money, num, ORDER_STATUS } from "@/lib/utils";

type Report = {
  preset: string;
  summary: {
    orders: number;
    delivered: number;
    cancelled: number;
    gross: number;
    discounts: number;
    delivery: number;
    commission: number;
    net: number;
    avgOrder: number;
  };
  rows: {
    id: number;
    code: string;
    status: string;
    total: string;
    subtotal: string;
    discountAmount: string;
    deliveryFee: string;
    storeCommission: string;
    paymentMethod: string;
    placedAt: string;
    customerName?: string;
  }[];
  topItems: { name: string; qty: number; total: number }[];
  daily: { date: string; orders: number; sales: number }[];
};

export function ReportsPanel() {
  const { notify } = useToast();
  const [preset, setPreset] = useState("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ preset });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const d = await apiGet<Report>(`/api/store/reports?${params.toString()}`);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [preset, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const head = [
      "رقم الطلب",
      "التاريخ",
      "الحالة",
      "المبلغ الفرعي",
      "الخصم",
      "التوصيل",
      "الإجمالي",
      "عمولة لقمة",
      "طريقة الدفع",
    ];
    const lines = data.rows.map((r) => [
      r.code,
      new Date(r.placedAt).toLocaleString("ar"),
      ORDER_STATUS[r.status]?.label ?? r.status,
      num(r.subtotal).toFixed(3),
      num(r.discountAmount).toFixed(3),
      num(r.deliveryFee).toFixed(3),
      num(r.total).toFixed(3),
      num(r.storeCommission).toFixed(3),
      r.paymentMethod === "card" ? "بطاقة" : "BenefitPay",
    ]);
    const csv = [head, ...lines].map((l) => l.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luqma-report-${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify({ title: "تم تصدير التقرير بصيغة Excel ✅", kind: "success" });
  };

  if (loading || !data)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const s = data.summary;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1.5">
            {[
              { k: "today", l: "اليوم" },
              { k: "week", l: "أسبوعي" },
              { k: "month", l: "شهري" },
              { k: "custom", l: "فترة مخصصة" },
            ].map((p) => (
              <button
                key={p.k}
                onClick={() => setPreset(p.k)}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  preset === p.k
                    ? "bg-brand-700 text-white"
                    : "bg-brand-50 text-brand-800"
                }`}
              >
                {p.l}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex flex-wrap gap-2">
              <Field label="من">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="إلى">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
          <div className="flex-1" />
          <div className="flex gap-2">
            <Btn variant="primary" onClick={exportCsv}>
              ⬇ Excel
            </Btn>
            <Btn variant="dark" onClick={() => window.print()}>
              🖨 PDF
            </Btn>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="عدد الطلبات" value={String(s.orders)} hint={`مسلّم ${s.delivered} · ملغي ${s.cancelled}`} tone="brand" icon="🧾" />
        <StatCard label="إجمالي المبيعات" value={money(s.gross)} hint={`متوسط ${money(s.avgOrder)}`} tone="gold" icon="💰" />
        <StatCard label="الخصومات" value={money(s.discounts)} hint="خصومات مطبّقة" tone="red" icon="🏷️" />
        <StatCard label="صافي المتجر" value={money(s.net)} hint={`بعد عمولة ${money(s.commission)}`} tone="green" icon="📈" />
      </div>

      <div id="report-print" className="space-y-4">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-black text-brand-950">
            تفاصيل الطلبات ({data.rows.length})
          </h3>
          <div className="overflow-x-auto lq-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-right text-[11px] text-slate-500">
                  <th className="py-2">الطلب</th>
                  <th className="py-2">التاريخ</th>
                  <th className="py-2">الحالة</th>
                  <th className="py-2">المجموع</th>
                  <th className="py-2">التوصيل</th>
                  <th className="py-2">عمولة لقمة</th>
                  <th className="py-2">الإجمالي</th>
                  <th className="py-2">الدفع</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 font-black" dir="ltr">
                      {r.code}
                    </td>
                    <td className="py-2">{formatDateTime(r.placedAt)}</td>
                    <td className="py-2">{ORDER_STATUS[r.status]?.label ?? r.status}</td>
                    <td className="py-2">{money(r.subtotal)}</td>
                    <td className="py-2">{money(r.deliveryFee)}</td>
                    <td className="py-2 text-brand-700">{money(r.storeCommission)}</td>
                    <td className="py-2 font-black">{money(r.total)}</td>
                    <td className="py-2">
                      {r.paymentMethod === "card" ? "بطاقة" : "BenefitPay"}
                    </td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      لا توجد طلبات في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-black text-brand-950">
              الأصناف الأكثر مبيعاً
            </h3>
            <div className="space-y-2">
              {data.topItems.map((it, i) => (
                <div key={it.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-black text-brand-800">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs font-bold text-brand-900">
                    {it.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ×{it.qty}
                  </span>
                  <span className="text-xs font-black">{money(it.total)}</span>
                </div>
              ))}
              {data.topItems.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">
                  لا توجد بيانات
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-black text-brand-950">
              المبيعات اليومية
            </h3>
            <div className="flex h-40 items-end gap-1.5">
              {data.daily.slice(-14).map((d) => {
                const max = Math.max(...data.daily.map((x) => x.sales), 1);
                return (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center justify-end gap-1"
                  >
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-700 to-gold-400"
                      style={{
                        height: `${Math.max(4, (d.sales / max) * 100)}%`,
                      }}
                      title={`${d.date}: ${d.sales.toFixed(3)}`}
                    />
                    <span className="text-[8px] text-slate-400">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
              {data.daily.length === 0 && (
                <p className="w-full py-10 text-center text-xs text-slate-400">
                  لا توجد بيانات
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
