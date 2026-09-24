"use client";

import { useCallback, useEffect, useState } from "react";
import { useNewOrderAlarm } from "@/components/AppShell";
import { Badge, Btn, Card, Empty, Modal, Spinner, inputCls } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { money, num, ORDER_STATUS, PAYMENT_LABEL, timeAgo } from "@/lib/utils";

type Order = {
  id: number;
  code: string;
  status: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  discountAmount: string;
  storeCommission: string;
  paymentMethod: string;
  addressText: string;
  notes: string;
  cancelReason: string | null;
  customerName: string;
  customerPhone: string;
  driverName: string | null;
  placedAt: string;
  items: {
    id: number;
    nameAr: string;
    sizeName: string | null;
    quantity: number;
    lineTotal: string;
    notes: string;
    addons: { nameAr: string; price: string }[];
  }[];
};

const REASONS = [
  "نفاد المخزون",
  "المطبخ مغلق الآن",
  "طلب غير واضح / معلومات ناقصة",
  "خارج نطاق التوصيل",
  "عطل تقني",
  "أخرى",
];

export function OrdersPanel({ onChanged }: { onChanged: () => void }) {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<{
    order: Order;
    kind: "reject" | "cancel";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<{ orders: Order[] }>("/api/orders");
      setOrders(d.orders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const pendingIds = orders.filter((o) => o.status === "pending").map((o) => o.id);
  useNewOrderAlarm(
    pendingIds,
    (id) => `طلب ${orders.find((o) => o.id === id)?.code ?? id}`,
  );

  const act = async (order: Order, a: string, reasonText?: string) => {
    setBusy(order.id);
    try {
      await apiPatch(`/api/orders/${order.id}`, { action: a, reason: reasonText });
      notify({
        title:
          a === "accept"
            ? `تم قبول الطلب ${order.code} ✅`
            : a === "ready"
              ? `الطلب ${order.code} جاهز للتوصيل 🛵`
              : `تم إلغاء الطلب ${order.code}`,
        kind: a === "reject" || a === "cancel" ? "info" : "success",
      });
      load();
      onChanged();
    } catch (e) {
      notify({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(null);
    }
  };

  const sections: { key: string; label: string; statuses: string[]; tone: string }[] = [
    { key: "new", label: "طلبات جديدة", statuses: ["pending"], tone: "gold" },
    {
      key: "prep",
      label: "قيد التحضير",
      statuses: ["accepted", "preparing"],
      tone: "brand",
    },
    {
      key: "out",
      label: "جاهزة / مع المندوب",
      statuses: ["ready", "assigned", "picked_up", "on_the_way"],
      tone: "blue",
    },
    {
      key: "done",
      label: "مكتملة / ملغية",
      statuses: ["delivered", "cancelled"],
      tone: "gray",
    },
  ];

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  return (
    <div className="space-y-6">
      {sections.map((sec) => {
        const list = orders.filter((o) => sec.statuses.includes(o.status));
        if (list.length === 0 && sec.key !== "new") return null;
        return (
          <section key={sec.key}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-brand-950">
              <span
                className={`h-2 w-2 rounded-full ${
                  sec.key === "new" ? "bg-gold-400" : "bg-brand-400"
                }`}
              />
              {sec.label} ({list.length})
            </h3>
            {list.length === 0 ? (
              <Empty icon="☕" title="لا توجد طلبات حالياً" desc="الطلبات الجديدة تظهر هنا فوراً مع تنبيه صوتي" />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {list.map((o) => (
                  <Card
                    key={o.id}
                    className={`overflow-hidden ${
                      o.status === "pending" ? "ring-2 ring-gold-300" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-brand-950" dir="ltr">
                          {o.code}
                        </span>
                        <Badge
                          tone={
                            ORDER_STATUS[o.status]?.tone ?? "brand"
                          }
                        >
                          {ORDER_STATUS[o.status]?.label ?? o.status}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {timeAgo(o.placedAt)}
                      </span>
                    </div>

                    <div className="space-y-1.5 px-4 py-3">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex justify-between gap-2 text-xs">
                          <div>
                            <span className="font-black text-brand-900">{it.quantity}×</span>{" "}
                            <span className="font-semibold">{it.nameAr}</span>
                            {it.sizeName && (
                              <span className="text-[10px] text-slate-400">
                                {" "}
                                ({it.sizeName})
                              </span>
                            )}
                            {it.addons.length > 0 && (
                              <p className="text-[10px] text-slate-400">
                                + {it.addons.map((a) => a.nameAr).join("، ")}
                              </p>
                            )}
                            {it.notes && (
                              <p className="text-[10px] font-bold text-amber-600">
                                ملاحظة: {it.notes}
                              </p>
                            )}
                          </div>
                          <span className="font-black">{money(it.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">العميل</span>
                        <span className="font-bold">
                          {o.customerName} · {o.customerPhone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">العنوان</span>
                        <span className="max-w-[65%] text-left font-bold">
                          {o.addressText}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الدفع</span>
                        <span className="font-bold">
                          {PAYMENT_LABEL[o.paymentMethod]}
                        </span>
                      </div>
                      {o.notes && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">ملاحظات</span>
                          <span className="max-w-[65%] text-left font-bold">{o.notes}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm">
                        <span className="font-black">الإجمالي</span>
                        <span className="font-black text-gold-600">{money(o.total)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-brand-700">
                        <span>عمولة لقمة</span>
                        <span className="font-black">{money(o.storeCommission)}</span>
                      </div>
                      {o.cancelReason && (
                        <p className="rounded bg-red-50 px-2 py-1 font-bold text-red-600">
                          {o.cancelReason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
                      {o.status === "pending" && (
                        <>
                          <Btn
                            variant="gold"
                            className="flex-1 py-2 text-xs"
                            disabled={busy === o.id}
                            onClick={() => act(o, "accept")}
                          >
                            ✅ قبول الطلب
                          </Btn>
                          <Btn
                            variant="danger"
                            className="py-2 text-xs"
                            onClick={() => {
                              setReason("");
                              setAction({ order: o, kind: "reject" });
                            }}
                          >
                            رفض
                          </Btn>
                        </>
                      )}
                      {["accepted", "preparing"].includes(o.status) && (
                        <>
                          <Btn
                            variant="primary"
                            className="flex-1 py-2 text-xs"
                            disabled={busy === o.id}
                            onClick={() => act(o, "ready")}
                          >
                            🍱 الطلب جاهز للتوصيل
                          </Btn>
                          <Btn
                            variant="outline"
                            className="py-2 text-xs"
                            onClick={() => {
                              setReason("");
                              setAction({ order: o, kind: "cancel" });
                            }}
                          >
                            إلغاء
                          </Btn>
                        </>
                      )}
                      {["ready", "assigned", "picked_up", "on_the_way"].includes(o.status) && (
                        <div className="flex w-full items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold text-sky-800">
                          <span>
                            {o.driverName
                              ? `🛵 المندوب: ${o.driverName}`
                              : "⏳ بانتظار مندوب متاح"}
                          </span>
                          <span>{num(o.deliveryFee)} د.ب رسوم توصيل</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.kind === "reject" ? "رفض الطلب" : "إلغاء الطلب"}
        footer={
          <>
            <Btn
              variant="danger"
              className="flex-1"
              disabled={!reason.trim()}
              onClick={() => {
                if (!action) return;
                const o = action.order;
                const kind = action.kind;
                setAction(null);
                act(o, kind === "reject" ? "reject" : "cancel", reason);
              }}
            >
              تأكيد
            </Btn>
            <Btn variant="outline" onClick={() => setAction(null)}>
              رجوع
            </Btn>
          </>
        }
      >
        <p className="mb-3 text-sm text-brand-800">
          يجب تحديد سبب {action?.kind === "reject" ? "الرفض" : "الإلغاء"} للطلب{" "}
          <b dir="ltr">{action?.order.code}</b>
        </p>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {REASONS.map((r) => (
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
          rows={3}
          className={inputCls}
          placeholder="اكتب السبب..."
        />
      </Modal>
    </div>
  );
}
