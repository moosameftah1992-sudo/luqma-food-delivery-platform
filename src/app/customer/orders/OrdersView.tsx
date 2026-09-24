"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Badge, Btn, Card, Empty, Modal, Spinner, inputCls } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { playAlert } from "@/lib/sound";
import {
  cancelDeadline,
  canCustomerCancel,
  formatDateTime,
  money,
  num,
  ORDER_STATUS,
  PAYMENT_LABEL,
} from "@/lib/utils";

const NAV: NavItem[] = [
  { href: "/customer", label: "الرئيسية", icon: "🏠" },
  { href: "/customer/orders", label: "طلباتي", icon: "🧾" },
];

type OrderItem = {
  id: number;
  nameAr: string;
  sizeName: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  notes: string;
  addons: { nameAr: string; price: string }[];
};

type Order = {
  id: number;
  code: string;
  restaurantId: number;
  restaurantName: string;
  restaurantEmoji: string;
  status: string;
  paymentMethod: string;
  subtotal: string;
  discountAmount: string;
  deliveryFee: string;
  total: string;
  addressText: string;
  notes: string;
  cancelReason: string | null;
  rating: number | null;
  placedAt: string;
  deliveredAt: string | null;
  driverName: string | null;
  items: OrderItem[];
};

const STEPS = [
  { key: "pending", label: "تم الإرسال", icon: "📨" },
  { key: "accepted", label: "قبول المتجر", icon: "✅" },
  { key: "ready", label: "جاهز", icon: "🍱" },
  { key: "on_the_way", label: "في الطريق", icon: "🛵" },
  { key: "delivered", label: "تم التوصيل", icon: "🎉" },
];

export function OrdersView({
  user,
}: {
  user: { id: number; fullName: string; email: string; role: string };
}) {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelFor, setCancelFor] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [rateFor, setRateFor] = useState<Order | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [now, setNow] = useState(Date.now());
  const known = useRef<Map<number, string>>(new Map());

  const load = useCallback(async () => {
    try {
      const d = await apiGet<{ orders: Order[] }>("/api/orders");
      setOrders(d.orders);
      for (const o of d.orders) {
        const prev = known.current.get(o.id);
        if (prev && prev !== o.status) {
          playAlert(o.status === "cancelled" ? "error" : "info");
          notify({
            title: `تحديث الطلب ${o.code}`,
            body: ORDER_STATUS[o.status]?.label ?? o.status,
            kind: o.status === "cancelled" ? "error" : "info",
          });
        }
        known.current.set(o.id, o.status);
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      clearInterval(t);
    };
  }, [load]);

  const doCancel = async () => {
    if (!cancelFor) return;
    try {
      await apiPatch(`/api/orders/${cancelFor.id}`, {
        action: "cancel",
        reason,
      });
      notify({ title: "تم إلغاء الطلب", kind: "info" });
      setCancelFor(null);
      setReason("");
      load();
    } catch (e) {
      notify({ title: (e as Error).message, kind: "error" });
    }
  };

  const doRate = async () => {
    if (!rateFor) return;
    try {
      await apiPatch(`/api/orders/${rateFor.id}`, {
        action: "rate",
        rating: stars,
        comment,
      });
      notify({ title: "شكراً لتقييمك ⭐", kind: "success" });
      setRateFor(null);
      setComment("");
      setStars(5);
      load();
    } catch (e) {
      notify({ title: (e as Error).message, kind: "error" });
    }
  };

  const active = orders.filter((o) =>
    ["pending", "accepted", "preparing", "ready", "assigned", "picked_up", "on_the_way"].includes(
      o.status,
    ),
  );
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <AppShell user={user} title="طلباتي" subtitle="تابع حالة طلباتك لحظة بلحظة" homeHref="/customer" nav={NAV}>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : orders.length === 0 ? (
        <Empty icon="🧾" title="لا توجد طلبات بعد" desc="ابدأ طلب وجبتك المفضلة الآن" />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-black text-brand-950">
                الطلبات الجارية ({active.length})
              </h2>
              <div className="space-y-4">
                {active.map((o) => (
                  <OrderCard
                    key={o.id}
                    o={o}
                    now={now}
                    onCancel={() => {
                      setReason("");
                      setCancelFor(o);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-black text-brand-950">
                الطلبات السابقة ({past.length})
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {past.map((o) => (
                  <OrderCard
                    key={o.id}
                    o={o}
                    now={now}
                    onRate={() => {
                      setStars(o.rating ?? 5);
                      setComment("");
                      setRateFor(o);
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Cancel modal */}
      <Modal
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        title="إلغاء الطلب"
        footer={
          <>
            <Btn variant="danger" className="flex-1" disabled={!reason.trim()} onClick={doCancel}>
              تأكيد الإلغاء
            </Btn>
            <Btn variant="outline" onClick={() => setCancelFor(null)}>
              رجوع
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-800">
            إلغاء الطلب <b>{cancelFor?.code}</b> — يرجى تحديد سبب الإلغاء (إلزامي).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "غيرت رأيي",
              "وقت التوصيل طويل جداً",
              "خطأ في عنوان التوصيل",
              "أضفت وجبات بالخطأ",
              "وجدت بديلاً أفضل",
              "أخرى",
            ].map((r) => (
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
            placeholder="اكتب سبب الإلغاء..."
          />
        </div>
      </Modal>

      {/* Rate modal */}
      <Modal
        open={!!rateFor}
        onClose={() => setRateFor(null)}
        title="قيّم تجربتك"
        footer={
          <>
            <Btn variant="gold" className="flex-1" onClick={doRate}>
              إرسال التقييم
            </Btn>
            <Btn variant="outline" onClick={() => setRateFor(null)}>
              لاحقاً
            </Btn>
          </>
        }
      >
        <div className="space-y-4 text-center">
          <p className="text-sm font-bold text-brand-800">
            كيف كانت تجربتك مع {rateFor?.restaurantName}؟
          </p>
          <div className="flex justify-center gap-2 text-3xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setStars(s)}
                className={`transition ${s <= stars ? "text-gold-400" : "text-slate-200"}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="شاركنا رأيك (اختياري)..."
          />
        </div>
      </Modal>
    </AppShell>
  );
}

function OrderCard({
  o,
  now,
  onCancel,
  onRate,
}: {
  o: Order;
  now: number;
  onCancel?: () => void;
  onRate?: () => void;
}) {
  const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: "brand", step: 1 };
  const cancellable = onCancel && canCustomerCancel(o.placedAt, o.status);
  const remaining = Math.max(
    0,
    Math.floor((new Date(cancelDeadline(o.placedAt)).getTime() - now) / 1000),
  );

  const currentStep = (() => {
    if (o.status === "cancelled") return -1;
    if (["pending"].includes(o.status)) return 0;
    if (["accepted", "preparing"].includes(o.status)) return 1;
    if (["ready", "assigned"].includes(o.status)) return 2;
    if (["picked_up", "on_the_way"].includes(o.status)) return 3;
    return 4;
  })();

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
            {o.restaurantEmoji}
          </div>
          <div>
            <p className="text-sm font-black text-brand-950">{o.restaurantName}</p>
            <p className="text-[11px] text-slate-400" dir="ltr">
              {o.code} · {formatDateTime(o.placedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={st.tone}>{st.label}</Badge>
          {o.driverName && <Badge tone="blue">🛵 {o.driverName}</Badge>}
        </div>
      </div>

      {o.status !== "cancelled" && (
        <div className="flex items-center gap-1 px-4 py-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                    i <= currentStep
                      ? "bg-brand-700 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s.icon}
                </div>
                <span
                  className={`whitespace-nowrap text-[9px] font-bold ${
                    i <= currentStep ? "text-brand-800" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-1 flex-1 rounded-full ${
                    i < currentStep ? "bg-brand-700" : "bg-slate-100"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5 border-t border-slate-100 px-4 py-3">
        {o.items.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
            <div>
              <span className="font-black text-brand-900">{it.quantity}×</span>{" "}
              <span className="font-semibold text-brand-800">{it.nameAr}</span>
              {it.sizeName && (
                <span className="text-[10px] text-slate-400"> ({it.sizeName})</span>
              )}
              {it.addons.length > 0 && (
                <p className="text-[10px] text-slate-400">
                  + {it.addons.map((a) => a.nameAr).join("، ")}
                </p>
              )}
            </div>
            <span className="font-black text-brand-900">{money(it.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">المجموع</span>
          <span className="font-black">{money(o.subtotal)}</span>
        </div>
        {num(o.discountAmount) > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>الخصم</span>
            <span className="font-black">- {money(o.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">التوصيل</span>
          <span className="font-black">{money(o.deliveryFee)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm">
          <span className="font-black text-brand-950">الإجمالي</span>
          <span className="font-black text-gold-600">{money(o.total)}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-slate-500">الدفع</span>
          <span className="font-bold">{PAYMENT_LABEL[o.paymentMethod]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">العنوان</span>
          <span className="max-w-[60%] text-left font-bold">{o.addressText}</span>
        </div>
        {o.cancelReason && (
          <p className="mt-1 rounded-lg bg-red-50 px-2 py-1 font-bold text-red-600">
            سبب الإلغاء: {o.cancelReason}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3">
        {cancellable && (
          <>
            <Btn variant="danger" className="flex-1 py-2 text-xs" onClick={onCancel}>
              إلغاء الطلب
            </Btn>
            <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
              متبقٍ {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          </>
        )}
        {onRate && o.status === "delivered" && (
          <Btn variant="gold" className="flex-1 py-2 text-xs" onClick={onRate}>
            {o.rating ? "تعديل التقييم ⭐" : "قيّم الطلب ⭐"}
          </Btn>
        )}
        {o.status === "delivered" && o.rating ? (
          <span className="text-xs text-gold-500">
            {"★".repeat(o.rating)}
            <span className="text-slate-300">{"★".repeat(5 - o.rating)}</span>
          </span>
        ) : null}
        <Link
          href={`/customer/r/${o.restaurantId}`}
          className="rounded-xl border border-brand-200 px-4 py-2 text-xs font-black text-brand-800"
        >
          إعادة الطلب
        </Link>
      </div>
    </Card>
  );
}
