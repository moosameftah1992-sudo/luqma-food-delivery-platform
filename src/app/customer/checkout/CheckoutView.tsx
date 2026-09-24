"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge, Btn, Card, Empty, Field, inputCls } from "@/components/ui";
import { useCart } from "@/components/CartProvider";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { money, num } from "@/lib/utils";

type Gov = { id: number; nameAr: string; areas: { id: number; nameAr: string; deliveryFee: string }[] };

export function CheckoutView({
  user,
}: {
  user: { id: number; fullName: string; email: string; role: string };
}) {
  const router = useRouter();
  const { cart, count, subtotal, clear, setQty } = useCart();
  const { notify } = useToast();
  const [govs, setGovs] = useState<Gov[]>([]);
  const [govId, setGovId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [addressText, setAddressText] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"card" | "benefitpay">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [benefitPhone, setBenefitPhone] = useState("");
  const [rest, setRest] = useState<{
    minOrder: string;
    deliveryFee: string;
    discountPercent: number;
    nameAr: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ governorates: Gov[] }>("/api/locations").then((d) => {
      setGovs(d.governorates);
      const g = Number(localStorage.getItem("luqma_gov")) || d.governorates[0]?.id;
      const a =
        Number(localStorage.getItem("luqma_area")) ||
        d.governorates[0]?.areas[0]?.id;
      setGovId(g);
      setAreaId(a);
    });
  }, []);

  useEffect(() => {
    if (cart.restaurantId) {
      apiGet<{
        restaurant: {
          minOrder: string;
          deliveryFee: string;
          discountPercent: number;
          nameAr: string;
        };
      }>(`/api/restaurants/${cart.restaurantId}`).then((d) => setRest(d.restaurant));
    }
  }, [cart.restaurantId]);

  const deliveryFee = num(rest?.deliveryFee);
  const discountPct = rest?.discountPercent ?? 0;
  const discount = (subtotal * discountPct) / 100;
  const total = subtotal - discount + deliveryFee;
  const belowMin = rest ? subtotal < num(rest.minOrder) : false;

  const placeOrder = async () => {
    if (!cart.restaurantId || !count) return;
    if (belowMin) {
      notify({ title: `الحد الأدنى ${money(rest?.minOrder)}`, kind: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ code: string }>("/api/orders", {
        restaurantId: cart.restaurantId,
        governorateId: govId,
        areaId,
        addressText,
        notes,
        paymentMethod: method,
        cardNumber,
        cardName,
        expiry,
        cvv,
        benefitPhone,
        items: cart.lines.map((l) => ({
          itemId: l.itemId,
          sizeId: l.sizeId,
          quantity: l.quantity,
          notes: l.notes,
          addons: l.addons.map((a) => a.id),
        })),
      });
      clear();
      notify({ title: "تم إرسال طلبك بنجاح 🎉", body: `رقم الطلب ${res.code}`, kind: "success" });
      router.push("/customer/orders");
      router.refresh();
    } catch (e) {
      notify({ title: (e as Error).message, kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.restaurantId || count === 0) {
    return (
      <AppShell user={user} title="إتمام الطلب" homeHref="/customer">
        <Empty
          icon="🛒"
          title="سلتك فارغة"
          desc="أضف بعض الأصناف اللذيذة ثم عد لإتمام الطلب"
        />
        <div className="mt-4 text-center">
          <Link href="/customer" className="text-sm font-black text-brand-700">
            ← تصفح المتاجر
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} title="إتمام الطلب" subtitle={cart.restaurantName} homeHref="/customer">
      <Link href="/customer" className="mb-3 inline-flex text-xs font-black text-brand-700">
        → العودة
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Address */}
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-brand-950">
              <span className="text-gold-500">📍</span> عنوان التوصيل
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="المحافظة">
                <select
                  value={govId ?? ""}
                  onChange={(e) => {
                    setGovId(Number(e.target.value));
                    setAreaId(null);
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
                  value={areaId ?? ""}
                  onChange={(e) => setAreaId(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">— اختر المنطقة —</option>
                  {(govs.find((g) => g.id === govId)?.areas ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameAr}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="العنوان التفصيلي">
                <textarea
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="الشارع، رقم البناية، الشقة، علامة مميزة..."
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="ملاحظات للمندوب (اختياري)">
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                  placeholder="مثال: الاتصال قبل الوصول"
                />
              </Field>
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-black text-brand-950">
              <span className="text-gold-500">💳</span> طريقة الدفع
            </h2>
            <p className="mb-4 text-[11px] font-bold text-red-500">
              الدفع الإلكتروني فقط — لا يوجد الدفع عند الاستلام
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                onClick={() => setMethod("card")}
                className={`rounded-2xl border-2 p-4 text-right transition ${
                  method === "card"
                    ? "border-brand-600 bg-brand-50"
                    : "border-slate-200"
                }`}
              >
                <p className="text-sm font-black text-brand-950">💳 بطاقة مدى/ائتمان</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Visa · Mastercard · Visa Electron
                </p>
              </button>
              <button
                onClick={() => setMethod("benefitpay")}
                className={`rounded-2xl border-2 p-4 text-right transition ${
                  method === "benefitpay"
                    ? "border-brand-600 bg-brand-50"
                    : "border-slate-200"
                }`}
              >
                <p className="text-sm font-black text-brand-950">📱 BenefitPay</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  الدفع عبر تطبيق البنك مباشرة
                </p>
              </button>
            </div>

            {method === "card" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="رقم البطاقة">
                    <input
                      dir="ltr"
                      value={cardNumber}
                      onChange={(e) =>
                        setCardNumber(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 16)
                            .replace(/(.{4})/g, "$1 ")
                            .trim(),
                        )
                      }
                      className={`${inputCls} text-left`}
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="اسم حامل البطاقة">
                    <input
                      dir="ltr"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className={`${inputCls} text-left`}
                      placeholder="MOHAMMED AHMED"
                    />
                  </Field>
                </div>
                <Field label="تاريخ الانتهاء">
                  <input
                    dir="ltr"
                    value={expiry}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                    }}
                    className={`${inputCls} text-left`}
                    placeholder="12/28"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="CVV">
                  <input
                    dir="ltr"
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={`${inputCls} text-left`}
                    placeholder="123"
                    inputMode="numeric"
                  />
                </Field>
              </div>
            ) : (
              <div className="mt-4 max-w-sm">
                <Field label="رقم الجوال المسجل في BenefitPay">
                  <input
                    dir="ltr"
                    value={benefitPhone}
                    onChange={(e) => setBenefitPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className={`${inputCls} text-left`}
                    placeholder="36119511"
                    inputMode="numeric"
                  />
                </Field>
                <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700">
                  سيتم إرسال طلب الموافقة إلى تطبيق البنك لديك.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="overflow-hidden">
            <div className="border-b border-brand-50 bg-brand-50/60 px-5 py-3.5">
              <h2 className="text-sm font-black text-brand-950">ملخص الطلب</h2>
              <p className="text-[11px] text-slate-500">{cart.restaurantName}</p>
            </div>

            <div className="max-h-72 overflow-y-auto p-4 lq-scroll">
              {cart.lines.map((l) => (
                <div key={l.key} className="mb-3 flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-black text-brand-950">{l.nameAr}</p>
                    {l.sizeName && (
                      <p className="text-[10px] text-slate-400">{l.sizeName}</p>
                    )}
                    {l.addons.length > 0 && (
                      <p className="text-[10px] text-slate-400">
                        + {l.addons.map((a) => a.nameAr).join("، ")}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => setQty(l.key, l.quantity - 1)}
                        className="h-6 w-6 rounded-lg bg-brand-50 text-sm font-black text-brand-700"
                      >
                        −
                      </button>
                      <span className="text-xs font-black">{l.quantity}</span>
                      <button
                        onClick={() => setQty(l.key, l.quantity + 1)}
                        className="h-6 w-6 rounded-lg bg-brand-50 text-sm font-black text-brand-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="text-xs font-black text-brand-800">
                    {money((l.unitPrice + l.addons.reduce((s, a) => s + a.price, 0)) * l.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-100 p-4 text-xs">
              <Row label="المجموع الفرعي" value={money(subtotal)} />
              {discount > 0 && (
                <Row
                  label={`خصم ${discountPct}%`}
                  value={`- ${money(discount)}`}
                  tone="green"
                />
              )}
              <Row label="رسوم التوصيل" value={money(deliveryFee)} />
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-black text-brand-950">الإجمالي</span>
                <span className="font-black text-gold-600">{money(total)}</span>
              </div>
            </div>

            <div className="p-4 pt-0">
              {belowMin && (
                <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600">
                  الحد الأدنى للطلب {money(rest?.minOrder)}
                </p>
              )}
              <Btn
                variant="gold"
                className="w-full py-3"
                disabled={submitting || belowMin}
                onClick={placeOrder}
              >
                {submitting ? "جارٍ الدفع..." : `ادفع ${money(total)}`}
              </Btn>
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-amber-800">
                يمكنك إلغاء الطلب مجاناً خلال 5 دقائق فقط من وقت الإرسال، ويجب
                تحديد سبب الإلغاء.
              </p>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <Badge tone="green">🔒 دفع آمن</Badge>
                <Badge tone="brand">⚡ تأكيد فوري</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-semibold text-slate-500">{label}</span>
      <span
        className={`font-black ${tone === "green" ? "text-emerald-600" : "text-brand-900"}`}
      >
        {value}
      </span>
    </div>
  );
}
