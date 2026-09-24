"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Empty, Field, Modal, Spinner, inputCls } from "@/components/ui";
import { apiDel, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { money, num } from "@/lib/utils";

type Size = { id: number; nameAr: string; price: string };
type Addon = { id: number; nameAr: string; price: string; isAvailable: boolean };
type Group = { id: number; nameAr: string; selectionType: string; addons: Addon[] };
type Item = {
  id: number;
  nameAr: string;
  description: string;
  emoji: string;
  price: string;
  pendingPrice: string | null;
  isAvailable: boolean;
  discountPercent: number;
  sizes: Size[];
  groups: Group[];
  pendingRequest: { id: number; newPrice: string; status: string } | null;
};
type Cat = { id: number; nameAr: string; items: Item[] };

const EMOJIS = ["🍔", "🍕", "🍗", "🥩", "🌯", "🍟", "🥗", "🍰", "🥤", "🍜", "🦐", "🍢", "🥙", "☕", "🍴"];

export function MenuPanel() {
  const { notify } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addCatId, setAddCatId] = useState<number | null>(null);
  const [priceFor, setPriceFor] = useState<Item | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");

  // new item form
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fEmoji, setFEmoji] = useState("🍴");
  const [fPrice, setFPrice] = useState("");
  const [fSizes, setFSizes] = useState<{ nameAr: string; price: string }[]>([]);
  const [fGroupName, setFGroupName] = useState("");
  const [fGroupType, setFGroupType] = useState("multi");
  const [fAddons, setFAddons] = useState<{ nameAr: string; price: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<{ categories: Cat[] }>("/api/store/menu");
      setCats(d.categories);
      if (d.categories[0]) setAddCatId((v) => v ?? d.categories[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCategory = async () => {
    if (!newCat.trim()) return;
    await apiPost("/api/store/menu", { kind: "category", nameAr: newCat.trim() });
    setNewCat("");
    notify({ title: "تمت إضافة القسم ✅", kind: "success", silent: true });
    load();
  };

  const createItem = async () => {
    if (!fName.trim() || !addCatId) return;
    await apiPost("/api/store/menu", {
      kind: "item",
      categoryId: addCatId,
      nameAr: fName.trim(),
      description: fDesc,
      emoji: fEmoji,
      price: num(fPrice),
      sizes: fSizes.filter((s) => s.nameAr.trim()),
      groups: fGroupName.trim()
        ? [
            {
              nameAr: fGroupName,
              selectionType: fGroupType,
              addons: fAddons.filter((a) => a.nameAr.trim()),
            },
          ]
        : [],
    });
    setAddOpen(false);
    setFName("");
    setFDesc("");
    setFPrice("");
    setFSizes([]);
    setFGroupName("");
    setFAddons([]);
    notify({ title: "تمت إضافة الصنف ✅", kind: "success", silent: true });
    load();
  };

  const toggleAvail = async (it: Item) => {
    await apiPatch("/api/store/menu", { kind: "item_availability", id: it.id });
    load();
  };

  const setDiscount = async (it: Item, percent: number) => {
    await apiPatch("/api/store/menu", { kind: "item_discount", id: it.id, percent });
    notify({
      title: percent > 0 ? `تم تفعيل خصم ${percent}%` : "تم إزالة الخصم",
      kind: "success",
      silent: true,
    });
    load();
  };

  const submitPrice = async () => {
    if (!priceFor) return;
    await apiPatch("/api/store/menu", {
      kind: "item_price",
      id: priceFor.id,
      price: num(newPrice),
      reason: priceReason,
    });
    notify({
      title: "تم إرسال طلب تعديل السعر للإدارة 📨",
      body: "لن يتغير السعر إلا بعد موافقة الأدمن",
      kind: "success",
    });
    setPriceFor(null);
    setNewPrice("");
    setPriceReason("");
    load();
  };

  const removeItem = async (it: Item) => {
    await apiDel("/api/store/menu", { kind: "item", id: it.id });
    notify({ title: "تم حذف الصنف", kind: "info", silent: true });
    load();
  };

  const removeCat = async (c: Cat) => {
    await apiDel("/api/store/menu", { kind: "category", id: c.id });
    notify({ title: "تم حذف القسم وأصنافه", kind: "info", silent: true });
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-4">
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          className={`${inputCls} max-w-xs`}
          placeholder="قسم جديد (مثال: مقبلات)"
        />
        <Btn variant="primary" onClick={createCategory}>
          + إضافة قسم
        </Btn>
        <div className="flex-1" />
        <select
          value={addCatId ?? ""}
          onChange={(e) => setAddCatId(Number(e.target.value))}
          className="max-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameAr}
            </option>
          ))}
        </select>
        <Btn variant="gold" onClick={() => setAddOpen(true)}>
          + إضافة صنف
        </Btn>
      </Card>

      {cats.length === 0 && <Empty icon="🍽️" title="ابدأ بإضافة أقسام القائمة" />}

      {cats.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-50 bg-brand-50/60 px-5 py-3">
            <h3 className="text-sm font-black text-brand-950">
              {c.nameAr}{" "}
              <span className="text-[11px] font-bold text-slate-400">
                ({c.items.length})
              </span>
            </h3>
            <button
              onClick={() => removeCat(c)}
              className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50"
            >
              حذف القسم
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {c.items.length === 0 && (
              <p className="px-5 py-6 text-center text-xs text-slate-400">
                لا توجد أصناف في هذا القسم
              </p>
            )}
            {c.items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
                  {it.emoji}
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-brand-950">{it.nameAr}</p>
                    {it.discountPercent > 0 && (
                      <Badge tone="gold">خصم {it.discountPercent}%</Badge>
                    )}
                    {it.pendingRequest && (
                      <Badge tone="amber">
                        ⏳ سعر معلق {num(it.pendingRequest.newPrice).toFixed(3)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{it.description}</p>
                  <p className="mt-1 text-xs font-black text-brand-800">
                    {money(it.price)}
                    {it.sizes.length > 0 && (
                      <span className="mr-1 text-[10px] font-bold text-slate-400">
                        · {it.sizes.length} أحجام
                      </span>
                    )}
                    {it.groups.length > 0 && (
                      <span className="mr-1 text-[10px] font-bold text-slate-400">
                        · {it.groups.reduce((s, g) => s + g.addons.length, 0)} إضافات
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => toggleAvail(it)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
                      it.isAvailable
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {it.isAvailable ? "متوفر" : "نافد"}
                  </button>
                  <button
                    onClick={() => {
                      setPriceFor(it);
                      setNewPrice(num(it.price).toFixed(3));
                      setPriceReason("");
                    }}
                    className="rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] font-black text-brand-800"
                  >
                    💲 تعديل السعر
                  </button>
                  <select
                    value={it.discountPercent}
                    onChange={(e) => setDiscount(it, Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 50].map((d) => (
                      <option key={d} value={d}>
                        {d === 0 ? "بدون خصم" : `خصم ${d}%`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeItem(it)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Add item modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة صنف جديد"
        footer={
          <>
            <Btn variant="gold" className="flex-1" onClick={createItem}>
              حفظ الصنف
            </Btn>
            <Btn variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="الرمز">
              <select
                value={fEmoji}
                onChange={(e) => setFEmoji(e.target.value)}
                className={inputCls}
              >
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اسم الصنف">
              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className={inputCls}
                placeholder="مثال: برجر كلاسيك"
              />
            </Field>
          </div>
          <Field label="الوصف">
            <input
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              className={inputCls}
              placeholder="وصف مختصر"
            />
          </Field>
          <Field label="السعر الأساسي (د.ب)">
            <input
              type="number"
              step="0.001"
              value={fPrice}
              onChange={(e) => setFPrice(e.target.value)}
              className={inputCls}
              placeholder="0.000"
            />
          </Field>

          <div className="rounded-2xl border border-brand-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black text-brand-900">
                الأحجام (اختياري)
              </p>
              <button
                onClick={() =>
                  setFSizes([...fSizes, { nameAr: "", price: "0" }])
                }
                className="rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-black text-brand-800"
              >
                + حجم
              </button>
            </div>
            {fSizes.map((s, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={s.nameAr}
                  onChange={(e) =>
                    setFSizes(
                      fSizes.map((x, xi) =>
                        xi === i ? { ...x, nameAr: e.target.value } : x,
                      ),
                    )
                  }
                  className={inputCls}
                  placeholder="مثال: كبير"
                />
                <input
                  type="number"
                  step="0.001"
                  value={s.price}
                  onChange={(e) =>
                    setFSizes(
                      fSizes.map((x, xi) =>
                        xi === i ? { ...x, price: e.target.value } : x,
                      ),
                    )
                  }
                  className={`${inputCls} w-28`}
                  placeholder="السعر"
                />
                <button
                  onClick={() => setFSizes(fSizes.filter((_, xi) => xi !== i))}
                  className="rounded-lg bg-red-50 px-3 text-sm text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gold-200 bg-gold-50/40 p-3">
            <p className="mb-2 text-xs font-black text-brand-900">
              مجموعة إضافات (اختياري)
            </p>
            <div className="mb-2 grid grid-cols-[1fr_130px] gap-2">
              <input
                value={fGroupName}
                onChange={(e) => setFGroupName(e.target.value)}
                className={inputCls}
                placeholder="اسم المجموعة: الإضافات"
              />
              <select
                value={fGroupType}
                onChange={(e) => setFGroupType(e.target.value)}
                className={inputCls}
              >
                <option value="multi">اختيار متعدد</option>
                <option value="single">اختيار واحد</option>
              </select>
            </div>
            {fAddons.map((a, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={a.nameAr}
                  onChange={(e) =>
                    setFAddons(
                      fAddons.map((x, xi) =>
                        xi === i ? { ...x, nameAr: e.target.value } : x,
                      ),
                    )
                  }
                  className={inputCls}
                  placeholder="مثال: جبنة إضافية"
                />
                <input
                  type="number"
                  step="0.001"
                  value={a.price}
                  onChange={(e) =>
                    setFAddons(
                      fAddons.map((x, xi) =>
                        xi === i ? { ...x, price: e.target.value } : x,
                      ),
                    )
                  }
                  className={`${inputCls} w-28`}
                  placeholder="السعر"
                />
                <button
                  onClick={() => setFAddons(fAddons.filter((_, xi) => xi !== i))}
                  className="rounded-lg bg-red-50 px-3 text-sm text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setFAddons([...fAddons, { nameAr: "", price: "0" }])}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-brand-800"
            >
              + إضافة
            </button>
          </div>
        </div>
      </Modal>

      {/* Price modal */}
      <Modal
        open={!!priceFor}
        onClose={() => setPriceFor(null)}
        title="طلب تعديل السعر"
        footer={
          <>
            <Btn variant="gold" className="flex-1" onClick={submitPrice}>
              إرسال للإدارة
            </Btn>
            <Btn variant="outline" onClick={() => setPriceFor(null)}>
              إلغاء
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
            أي تعديل على السعر يحتاج موافقة الأدمن. السعر الحالي:{" "}
            <b>{money(priceFor?.price)}</b>
          </p>
          <Field label="السعر الجديد (د.ب)">
            <input
              type="number"
              step="0.001"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="سبب التعديل">
            <textarea
              value={priceReason}
              onChange={(e) => setPriceReason(e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="ارتفاع تكلفة المواد..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
