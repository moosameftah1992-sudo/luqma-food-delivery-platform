"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Field, Modal, Spinner, inputCls } from "@/components/ui";
import { apiDel, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { money, num } from "@/lib/utils";

type Rest = {
  id: number;
  nameAr: string;
  cuisine: string;
  emoji: string;
  status: string;
  isActive: boolean;
  ownerEmail: string | null;
  ownerName: string | null;
  commissionPerOrder: string;
  deliveryFee: string;
  minOrder: string;
  discountPercent: number;
  rating: string;
  orderCount: number;
  deliveredCount: number;
  sales: number;
  itemCount: number;
  address: string;
  phone: string;
};

type MenuItem = {
  id: number;
  nameAr: string;
  price: string;
  pendingPrice: string | null;
  isAvailable: boolean;
  discountPercent: number;
  sizes: { id: number; nameAr: string; price: string }[];
  groups: { id: number; nameAr: string; addons: { id: number; nameAr: string; price: string }[] }[];
};

export function RestaurantsPanel({ onChanged }: { onChanged: () => void }) {
  const { notify } = useToast();
  const [rests, setRests] = useState<Rest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<Rest | null>(null);
  const [menuFor, setMenuFor] = useState<Rest | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<{ restaurants: Rest[] }>("/api/admin/restaurants");
      setRests(d.restaurants);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );

  if (menuFor) return <MenuManager restaurant={menuFor} onBack={() => setMenuFor(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {rests.length} متجر مسجل على المنصة
        </p>
        <Btn variant="gold" onClick={() => setCreateOpen(true)}>
          + تسجيل متجر جديد
        </Btn>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rests.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
                  {r.emoji}
                </div>
                <div>
                  <p className="text-sm font-black text-brand-950">{r.nameAr}</p>
                  <p className="text-[11px] text-slate-400" dir="ltr">
                    {r.ownerEmail}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={r.status === "open" ? "green" : r.status === "busy" ? "amber" : "red"}>
                  {r.status === "open" ? "مفتوح" : r.status === "busy" ? "ضغط" : "مغلق"}
                </Badge>
                {!r.isActive && <Badge tone="red">موقوف</Badge>}
                {r.discountPercent > 0 && (
                  <Badge tone="gold">خصم {r.discountPercent}%</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-4 py-3 text-center">
              <div>
                <p className="text-[10px] text-slate-400">الطلبات</p>
                <p className="text-sm font-black">{r.orderCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">المبيعات</p>
                <p className="text-sm font-black">{money(r.sales)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">الأصناف</p>
                <p className="text-sm font-black">{r.itemCount}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-3">
              <Btn variant="ghost" className="py-1.5 text-[11px]" onClick={() => setMenuFor(r)}>
                🍽 إدارة القائمة
              </Btn>
              <Btn variant="outline" className="py-1.5 text-[11px]" onClick={() => setEditFor(r)}>
                ⚙ إعدادات
              </Btn>
              <Btn
                variant="ghost"
                className="py-1.5 text-[11px]"
                onClick={async () => {
                  await apiPatch(`/api/admin/restaurants/${r.id}`, {
                    status: r.status === "closed" ? "open" : "closed",
                  });
                  load();
                  onChanged();
                }}
              >
                {r.status === "closed" ? "فتح المتجر" : "إغلاق المتجر"}
              </Btn>
              <Btn
                variant="ghost"
                className="py-1.5 text-[11px]"
                onClick={async () => {
                  await apiPatch(`/api/admin/restaurants/${r.id}`, {
                    isActive: !r.isActive,
                  });
                  load();
                  onChanged();
                }}
              >
                {r.isActive ? "إيقاف" : "تفعيل"}
              </Btn>
              <button
                onClick={async () => {
                  if (!confirm(`حذف ${r.nameAr} نهائياً؟`)) return;
                  await apiDel(`/api/admin/restaurants/${r.id}`);
                  notify({ title: "تم حذف المتجر", kind: "info" });
                  load();
                  onChanged();
                }}
                className="rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600"
              >
                حذف
              </button>
            </div>
          </Card>
        ))}
      </div>

      <CreateRestaurantModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          load();
          onChanged();
        }}
      />
      <EditRestaurantModal
        restaurant={editFor}
        onClose={() => setEditFor(null)}
        onDone={() => {
          load();
          onChanged();
          setEditFor(null);
        }}
      />
    </div>
  );
}

function CreateRestaurantModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [f, setF] = useState({
    nameAr: "",
    cuisine: "عام",
    ownerName: "",
    email: "",
    password: "store123",
    phone: "",
    address: "",
    description: "",
    emoji: "🍽️",
    deliveryFee: "0.800",
    minOrder: "2.000",
    commissionPerOrder: "0.500",
    prepMinutes: "25",
  });

  const submit = async () => {
    try {
      const res = await apiPost<{ ownerEmail: string; password: string }>(
        "/api/admin/restaurants",
        f,
      );
      notify({
        title: `تم إنشاء المتجر ✅`,
        body: `${res.ownerEmail} / ${res.password}`,
        kind: "success",
      });
      onClose();
      onDone();
    } catch (e) {
      notify({ title: (e as Error).message, kind: "error" });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تسجيل متجر جديد"
      footer={
        <>
          <Btn variant="gold" className="flex-1" onClick={submit}>
            إنشاء المتجر وبيانات الدخول
          </Btn>
          <Btn variant="outline" onClick={onClose}>
            إلغاء
          </Btn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم المتجر">
          <input value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} className={inputCls} />
        </Field>
        <Field label="نوع المطبخ">
          <input value={f.cuisine} onChange={(e) => setF({ ...f, cuisine: e.target.value })} className={inputCls} />
        </Field>
        <Field label="اسم المالك">
          <input value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} className={inputCls} />
        </Field>
        <Field label="بريد الدخول">
          <input dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={`${inputCls} text-left`} placeholder="store@luqma.bh" />
        </Field>
        <Field label="كلمة المرور">
          <input dir="ltr" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={`${inputCls} text-left`} />
        </Field>
        <Field label="الهاتف">
          <input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={`${inputCls} text-left`} />
        </Field>
        <Field label="العنوان">
          <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inputCls} />
        </Field>
        <Field label="الوصف">
          <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} />
        </Field>
        <Field label="رسوم التوصيل">
          <input value={f.deliveryFee} onChange={(e) => setF({ ...f, deliveryFee: e.target.value })} className={inputCls} />
        </Field>
        <Field label="الحد الأدنى">
          <input value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} className={inputCls} />
        </Field>
        <Field label="عمولة لقمة لكل طلب" hint="الافتراضي 0.500">
          <input value={f.commissionPerOrder} onChange={(e) => setF({ ...f, commissionPerOrder: e.target.value })} className={inputCls} />
        </Field>
        <Field label="مدة التحضير (د)">
          <input value={f.prepMinutes} onChange={(e) => setF({ ...f, prepMinutes: e.target.value })} className={inputCls} />
        </Field>
      </div>
    </Modal>
  );
}

function EditRestaurantModal({
  restaurant,
  onClose,
  onDone,
}: {
  restaurant: Rest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [f, setF] = useState({
    nameAr: "",
    cuisine: "",
    address: "",
    phone: "",
    deliveryFee: "0.800",
    minOrder: "2.000",
    commissionPerOrder: "0.500",
    discountPercent: 0,
    newPassword: "",
  });

  useEffect(() => {
    if (restaurant)
      setF({
        nameAr: restaurant.nameAr,
        cuisine: restaurant.cuisine,
        address: restaurant.address,
        phone: restaurant.phone,
        deliveryFee: restaurant.deliveryFee,
        minOrder: restaurant.minOrder,
        commissionPerOrder: restaurant.commissionPerOrder,
        discountPercent: restaurant.discountPercent,
        newPassword: "",
      });
  }, [restaurant]);

  if (!restaurant) return null;

  const save = async () => {
    await apiPatch(`/api/admin/restaurants/${restaurant.id}`, {
      ...f,
      resetPassword: f.newPassword || undefined,
    });
    notify({ title: "تم حفظ إعدادات المتجر ✅", kind: "success" });
    onDone();
  };

  return (
    <Modal
      open={!!restaurant}
      onClose={onClose}
      title={`إعدادات ${restaurant.nameAr}`}
      footer={
        <>
          <Btn variant="gold" className="flex-1" onClick={save}>
            حفظ
          </Btn>
          <Btn variant="outline" onClick={onClose}>
            إغلاق
          </Btn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم المتجر">
          <input value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} className={inputCls} />
        </Field>
        <Field label="نوع المطبخ">
          <input value={f.cuisine} onChange={(e) => setF({ ...f, cuisine: e.target.value })} className={inputCls} />
        </Field>
        <Field label="العنوان">
          <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inputCls} />
        </Field>
        <Field label="الهاتف">
          <input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={`${inputCls} text-left`} />
        </Field>
        <Field label="رسوم التوصيل">
          <input value={f.deliveryFee} onChange={(e) => setF({ ...f, deliveryFee: e.target.value })} className={inputCls} />
        </Field>
        <Field label="الحد الأدنى">
          <input value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} className={inputCls} />
        </Field>
        <Field label="العمولة لكل طلب" hint="د.ب">
          <input value={f.commissionPerOrder} onChange={(e) => setF({ ...f, commissionPerOrder: e.target.value })} className={inputCls} />
        </Field>
        <Field label="نسبة الخصم %">
          <input
            type="number"
            value={f.discountPercent}
            onChange={(e) => setF({ ...f, discountPercent: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="إعادة تعيين كلمة مرور المتجر (اختياري)">
            <input
              dir="ltr"
              value={f.newPassword}
              onChange={(e) => setF({ ...f, newPassword: e.target.value })}
              className={`${inputCls} text-left`}
              placeholder="اتركه فارغاً للإبقاء"
            />
          </Field>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700" dir="ltr">
        {restaurant.ownerEmail}
      </p>
    </Modal>
  );
}

function MenuManager({
  restaurant,
  onBack,
}: {
  restaurant: Rest;
  onBack: () => void;
}) {
  const { notify } = useToast();
  const [cats, setCats] = useState<{ id: number; nameAr: string; items: MenuItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState<{ categoryId: number | null; nameAr: string; price: string } | null>(null);
  const [newCat, setNewCat] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<{ categories: { id: number; nameAr: string; items: MenuItem[] }[] }>(
        `/api/admin/menu?restaurantId=${restaurant.id}`,
      );
      setCats(d.categories);
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  const addCat = async () => {
    if (!newCat.trim()) return;
    await apiPost("/api/admin/menu", {
      kind: "category",
      restaurantId: restaurant.id,
      nameAr: newCat,
    });
    setNewCat("");
    load();
  };

  const addItem = async () => {
    if (!newItem?.nameAr || !newItem.categoryId) return;
    await apiPost("/api/admin/menu", {
      kind: "item",
      restaurantId: restaurant.id,
      categoryId: newItem.categoryId,
      nameAr: newItem.nameAr,
      price: num(newItem.price),
    });
    setNewItem(null);
    notify({ title: "تمت إضافة الصنف ✅", kind: "success", silent: true });
    load();
  };

  const patchItem = async (id: number, patch: Record<string, unknown>) => {
    await apiPatch("/api/admin/menu", { kind: "item", id, ...patch });
    load();
  };

  const deleteItem = async (id: number) => {
    await apiDel("/api/admin/menu", { kind: "item", id });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn variant="outline" onClick={onBack}>
          → رجوع للمتاجر
        </Btn>
        <h3 className="text-sm font-black text-brand-950">
          قائمة {restaurant.nameAr}
        </h3>
      </div>

      <Card className="flex flex-wrap gap-2 p-4">
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          className={`${inputCls} max-w-[200px]`}
          placeholder="قسم جديد"
        />
        <Btn variant="primary" onClick={addCat}>
          + قسم
        </Btn>
        <div className="flex-1" />
        <Btn
          variant="gold"
          onClick={() =>
            setNewItem({ categoryId: cats[0]?.id ?? null, nameAr: "", price: "0" })
          }
        >
          + صنف
        </Btn>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        cats.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-brand-50 bg-brand-50/60 px-5 py-3">
              <h4 className="text-sm font-black text-brand-950">
                {c.nameAr} ({c.items.length})
              </h4>
              <button
                onClick={() => setNewItem({ categoryId: c.id, nameAr: "", price: "0" })}
                className="rounded-lg bg-white px-3 py-1 text-[11px] font-black text-brand-800"
              >
                + صنف
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {c.items.map((it) => (
                <div key={it.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <input
                    value={it.nameAr}
                    onChange={(e) =>
                      setCats((cs) =>
                        cs.map((cc) =>
                          cc.id === c.id
                            ? {
                                ...cc,
                                items: cc.items.map((ii) =>
                                  ii.id === it.id ? { ...ii, nameAr: e.target.value } : ii,
                                ),
                              }
                            : cc,
                        ),
                      )
                    }
                    onBlur={() => patchItem(it.id, { nameAr: it.nameAr })}
                    className="min-w-[140px] flex-1 rounded-lg border border-transparent px-2 py-1 text-xs font-bold outline-none hover:border-slate-200 focus:border-brand-400"
                  />
                  <input
                    value={it.price}
                    onChange={(e) =>
                      setCats((cs) =>
                        cs.map((cc) =>
                          cc.id === c.id
                            ? {
                                ...cc,
                                items: cc.items.map((ii) =>
                                  ii.id === it.id ? { ...ii, price: e.target.value } : ii,
                                ),
                              }
                            : cc,
                        ),
                      )
                    }
                    onBlur={() => patchItem(it.id, { price: num(it.price) })}
                    className="w-24 rounded-lg border border-transparent px-2 py-1 text-xs font-black outline-none hover:border-slate-200 focus:border-brand-400"
                  />
                  {it.pendingPrice && (
                    <Badge tone="amber">طلب {num(it.pendingPrice).toFixed(3)}</Badge>
                  )}
                  <button
                    onClick={() => patchItem(it.id, { isAvailable: !it.isAvailable })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${
                      it.isAvailable
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {it.isAvailable ? "متوفر" : "نافد"}
                  </button>
                  <button
                    onClick={() => deleteItem(it.id)}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600"
                  >
                    حذف
                  </button>
                </div>
              ))}
              {c.items.length === 0 && (
                <p className="px-5 py-4 text-center text-xs text-slate-400">
                  لا توجد أصناف
                </p>
              )}
            </div>
          </Card>
        ))
      )}

      <Modal
        open={!!newItem}
        onClose={() => setNewItem(null)}
        title="إضافة صنف"
        footer={
          <>
            <Btn variant="gold" className="flex-1" onClick={addItem}>
              حفظ
            </Btn>
            <Btn variant="outline" onClick={() => setNewItem(null)}>
              إلغاء
            </Btn>
          </>
        }
      >
        {newItem && (
          <div className="space-y-3">
            <Field label="القسم">
              <select
                value={newItem.categoryId ?? ""}
                onChange={(e) =>
                  setNewItem({ ...newItem, categoryId: Number(e.target.value) })
                }
                className={inputCls}
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اسم الصنف">
              <input
                value={newItem.nameAr}
                onChange={(e) => setNewItem({ ...newItem, nameAr: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="السعر">
              <input
                type="number"
                step="0.001"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
