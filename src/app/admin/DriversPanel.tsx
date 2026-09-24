"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Modal, Spinner, Field, inputCls } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime, money, num } from "@/lib/utils";

type Driver = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  nationalId: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  status: string;
  isOnline: boolean;
  commissionRate: string;
  balanceDue: string;
  balancePaid: string;
  completed: number;
  cancelled: number;
  fees: number;
  emailVerified: boolean;
  joinedAt: string;
};

export function DriversPanel({ onChanged }: { onChanged: () => void }) {
  const { notify } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "banned">("all");
  const [payoutFor, setPayoutFor] = useState<Driver | null>(null);
  const [amount, setAmount] = useState("");
  const [commFor, setCommFor] = useState<Driver | null>(null);
  const [rate, setRate] = useState("10");

  const load = useCallback(async () => {
    try {
      const d = await apiGet<{ drivers: Driver[] }>("/api/admin/drivers");
      setDrivers(d.drivers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (d: Driver, action: string, extra: Record<string, unknown> = {}) => {
    await apiPatch("/api/admin/drivers", { driverId: d.id, action, ...extra });
    notify({
      title:
        action === "approve"
          ? `تم تفعيل ${d.fullName} ✅`
          : action === "ban"
            ? `تم إيقاف ${d.fullName}`
            : action === "unban"
              ? `تم إعادة تفعيل ${d.fullName}`
              : action === "reject"
                ? `تم رفض ${d.fullName}`
                : "تم التنفيذ",
      kind: action === "ban" || action === "reject" ? "error" : "success",
    });
    load();
    onChanged();
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const list = drivers.filter((d) => filter === "all" || d.status === filter);
  const counts = {
    all: drivers.length,
    pending: drivers.filter((d) => d.status === "pending").length,
    active: drivers.filter((d) => d.status === "active").length,
    banned: drivers.filter((d) => d.status === "banned" || d.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { k: "all", l: "الكل" },
            { k: "pending", l: "بانتظار الاعتماد" },
            { k: "active", l: "مفعّلون" },
            { k: "banned", l: "موقوفون / مرفوضون" },
          ] as const
        ).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
              filter === f.k ? "bg-brand-700 text-white" : "bg-white text-brand-800"
            }`}
          >
            {f.l} ({counts[f.k]})
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <Card className="p-10 text-center text-xs text-slate-400">
          لا يوجد مناديب في هذا التصنيف
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((d) => (
          <Card key={d.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-xl">
                  🛵
                </div>
                <div>
                  <p className="text-sm font-black text-brand-950">{d.fullName}</p>
                  <p className="text-[11px] text-slate-400" dir="ltr">
                    {d.email}
                  </p>
                  <p className="text-[11px] text-slate-400" dir="ltr">
                    {d.phone}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  tone={
                    d.status === "active"
                      ? "green"
                      : d.status === "pending"
                        ? "amber"
                        : "red"
                  }
                >
                  {d.status === "active"
                    ? "مفعّل"
                    : d.status === "pending"
                      ? "بانتظار المراجعة"
                      : d.status === "banned"
                        ? "موقوف"
                        : "مرفوض"}
                </Badge>
                {d.isOnline && <Badge tone="blue">أونلاين</Badge>}
                {!d.emailVerified && <Badge tone="amber">بريد غير مؤكد</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3 text-[11px] sm:grid-cols-3">
              <Info label="بطاقة الهوية" value={d.nationalId} />
              <Info label="رخصة القيادة" value={d.licenseNumber} />
              <Info label="المركبة" value={`${d.vehicleType} · ${d.vehiclePlate}`} />
              <Info label="طلبات مكتملة" value={String(d.completed)} />
              <Info label="رسوم التوصيل" value={money(d.fees)} />
              <Info label="العمولة" value={`${num(d.commissionRate)}%`} />
              <Info label="مستحق له" value={money(d.balanceDue)} />
              <Info label="مدفوع" value={money(d.balancePaid)} />
              <Info label="تاريخ التسجيل" value={formatDateTime(d.joinedAt)} />
            </div>

            <div className="flex flex-wrap gap-1.5 p-3">
              {d.status === "pending" && (
                <>
                  <Btn variant="gold" className="py-1.5 text-[11px]" onClick={() => act(d, "approve")}>
                    ✅ اعتماد الحساب
                  </Btn>
                  <Btn variant="danger" className="py-1.5 text-[11px]" onClick={() => act(d, "reject")}>
                    رفض
                  </Btn>
                </>
              )}
              {d.status === "active" && (
                <>
                  <Btn variant="danger" className="py-1.5 text-[11px]" onClick={() => act(d, "ban")}>
                    ⛔ إيقاف
                  </Btn>
                  <Btn
                    variant="ghost"
                    className="py-1.5 text-[11px]"
                    onClick={() => {
                      setRate(num(d.commissionRate).toFixed(0));
                      setCommFor(d);
                    }}
                  >
                    نسبة العمولة
                  </Btn>
                  <Btn
                    variant="primary"
                    className="py-1.5 text-[11px]"
                    disabled={num(d.balanceDue) <= 0}
                    onClick={() => {
                      setAmount(num(d.balanceDue).toFixed(3));
                      setPayoutFor(d);
                    }}
                  >
                    💵 تسوية مستحقات
                  </Btn>
                </>
              )}
              {(d.status === "banned" || d.status === "rejected") && (
                <Btn variant="primary" className="py-1.5 text-[11px]" onClick={() => act(d, "unban")}>
                  إعادة تفعيل
                </Btn>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!payoutFor}
        onClose={() => setPayoutFor(null)}
        title="تسوية مستحقات المندوب"
        footer={
          <>
            <Btn
              variant="gold"
              className="flex-1"
              onClick={async () => {
                if (!payoutFor) return;
                await act(payoutFor, "payout", { amount: num(amount) });
                setPayoutFor(null);
              }}
            >
              تأكيد التحويل
            </Btn>
            <Btn variant="outline" onClick={() => setPayoutFor(null)}>
              إلغاء
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-800">
            تحويل مستحقات لـ <b>{payoutFor?.fullName}</b> — الرصيد المستحق{" "}
            <b>{money(payoutFor?.balanceDue)}</b>
          </p>
          <Field label="المبلغ (د.ب)">
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!commFor}
        onClose={() => setCommFor(null)}
        title="تخصيص نسبة عمولة التوصيل"
        footer={
          <>
            <Btn
              variant="gold"
              className="flex-1"
              onClick={async () => {
                if (!commFor) return;
                await act(commFor, "commission", { rate: num(rate) });
                setCommFor(null);
              }}
            >
              حفظ النسبة
            </Btn>
            <Btn variant="outline" onClick={() => setCommFor(null)}>
              إلغاء
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-800">
            نسبة العمولة التي تقتطعها لقمة من رسوم التوصيل لـ{" "}
            <b>{commFor?.fullName}</b> (الافتراضي 10%)
          </p>
          <Field label="النسبة %">
            <input
              type="number"
              min={0}
              max={50}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="font-black text-brand-900" dir="ltr">
        {value}
      </p>
    </div>
  );
}
