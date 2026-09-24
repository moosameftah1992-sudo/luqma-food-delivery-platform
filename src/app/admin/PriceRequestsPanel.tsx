"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Empty, Modal, Spinner, Field, inputCls } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { money, num, timeAgo } from "@/lib/utils";

type Req = {
  id: number;
  itemId: number;
  itemName: string;
  oldPrice: string;
  newPrice: string;
  reason: string;
  status: string;
  reviewedNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  restaurantName: string;
};

export function PriceRequestsPanel({ onChanged }: { onChanged: () => void }) {
  const { notify } = useToast();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<{ req: Req; kind: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await apiGet<{ requests: Req[] }>("/api/admin/price-requests");
      setReqs(d.requests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const decide = async () => {
    if (!decision) return;
    await apiPatch("/api/admin/price-requests", {
      id: decision.req.id,
      decision: decision.kind,
      note,
    });
    notify({
      title:
        decision.kind === "approved"
          ? `تم اعتماد السعر الجديد ✅`
          : "تم رفض الطلب ❌",
      body: decision.req.itemName,
      kind: decision.kind === "approved" ? "success" : "info",
    });
    setDecision(null);
    setNote("");
    load();
    onChanged();
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const pending = reqs.filter((r) => r.status === "pending");
  const past = reqs.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-black text-brand-950">
          طلبات بانتظار القرار ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Empty icon="✅" title="لا توجد طلبات معلقة" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((r) => {
              const diff = num(r.newPrice) - num(r.oldPrice);
              return (
                <Card key={r.id} className="overflow-hidden ring-2 ring-amber-200">
                  <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-2.5">
                    <span className="text-xs font-black text-brand-950">
                      {r.restaurantName}
                    </span>
                    <Badge tone="amber">قيد المراجعة</Badge>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-black text-brand-950">{r.itemName}</p>
                    <div className="mt-2 flex items-center justify-center gap-4 rounded-xl bg-slate-50 p-3">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">السعر الحالي</p>
                        <p className="text-sm font-black text-slate-500 line-through">
                          {money(r.oldPrice)}
                        </p>
                      </div>
                      <span className="text-gold-500">←</span>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">السعر المطلوب</p>
                        <p className="text-lg font-black text-brand-900">
                          {money(r.newPrice)}
                        </p>
                      </div>
                      <Badge tone={diff >= 0 ? "red" : "green"}>
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(3)}
                      </Badge>
                    </div>
                    {r.reason && (
                      <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-800">
                        السبب: {r.reason}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">
                      {timeAgo(r.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Btn
                        variant="primary"
                        className="flex-1 py-2 text-xs"
                        onClick={() => {
                          setNote("");
                          setDecision({ req: r, kind: "approved" });
                        }}
                      >
                        ✅ موافقة
                      </Btn>
                      <Btn
                        variant="danger"
                        className="flex-1 py-2 text-xs"
                        onClick={() => {
                          setNote("");
                          setDecision({ req: r, kind: "rejected" });
                        }}
                      >
                        ❌ رفض
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-black text-brand-950">
            السجل ({past.length})
          </h3>
          <Card className="overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-right text-[11px] text-slate-500">
                  <th className="py-2.5 pr-4">المتجر</th>
                  <th className="py-2.5">الصنف</th>
                  <th className="py-2.5">من</th>
                  <th className="py-2.5">إلى</th>
                  <th className="py-2.5">القرار</th>
                  <th className="py-2.5 pl-4">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {past.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4">{r.restaurantName}</td>
                    <td className="py-2.5 font-bold">{r.itemName}</td>
                    <td className="py-2.5 text-slate-400">{money(r.oldPrice)}</td>
                    <td className="py-2.5 font-black">{money(r.newPrice)}</td>
                    <td className="py-2.5">
                      <Badge tone={r.status === "approved" ? "green" : "red"}>
                        {r.status === "approved" ? "معتمد" : "مرفوض"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pl-4 text-slate-400">
                      {timeAgo(r.reviewedAt ?? r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.kind === "approved" ? "اعتماد السعر" : "رفض الطلب"}
        footer={
          <>
            <Btn
              variant={decision?.kind === "approved" ? "primary" : "danger"}
              className="flex-1"
              onClick={decide}
            >
              تأكيد القرار
            </Btn>
            <Btn variant="outline" onClick={() => setDecision(null)}>
              إلغاء
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-800">
            {decision?.req.itemName}: {money(decision?.req.oldPrice)} ←{" "}
            {money(decision?.req.newPrice)}
          </p>
          <Field label={decision?.kind === "approved" ? "ملاحظة (اختياري)" : "سبب الرفض"}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
