export const CURRENCY = "د.ب";

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function money(v: unknown, decimals = 3): string {
  const n = num(v);
  const fixed = n.toFixed(decimals);
  return `${fixed} ${CURRENCY}`;
}

export function moneyPlain(v: unknown, decimals = 3): string {
  return num(v).toFixed(decimals);
}

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => AR_DIGITS[Number(d)] ?? d);
}

export function formatDateTime(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${hh}:${mm}  ${day}/${month}/${year}`;
}

export function timeAgo(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `قبل ${diff} ثانية`;
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
  return `قبل ${Math.floor(diff / 86400)} يوم`;
}

export const ORDER_STATUS: Record<
  string,
  { label: string; tone: string; step: number }
> = {
  pending: { label: "بانتظار قبول المتجر", tone: "amber", step: 1 },
  accepted: { label: "تم القبول - قيد التحضير", tone: "purple", step: 2 },
  preparing: { label: "قيد التحضير", tone: "purple", step: 2 },
  ready: { label: "جاهز للتوصيل", tone: "gold", step: 3 },
  assigned: { label: "تم تعيين المندوب", tone: "blue", step: 4 },
  picked_up: { label: "تم الاستلام من المتجر", tone: "blue", step: 5 },
  on_the_way: { label: "في الطريق إليك", tone: "blue", step: 5 },
  delivered: { label: "تم التوصيل", tone: "green", step: 6 },
  cancelled: { label: "ملغي", tone: "red", step: 0 },
};

export const PAYMENT_LABEL: Record<string, string> = {
  card: "بطاقة ائتمان/خصم",
  benefitpay: "BenefitPay",
};

export const CANCEL_WINDOW_MINUTES = 5;

export function canCustomerCancel(placedAt: string | Date, status: string) {
  if (status !== "pending" && status !== "accepted") return false;
  const placed = new Date(placedAt).getTime();
  const diffMin = (Date.now() - placed) / 60000;
  return diffMin <= CANCEL_WINDOW_MINUTES;
}

export function cancelDeadline(placedAt: string | Date) {
  return new Date(new Date(placedAt).getTime() + CANCEL_WINDOW_MINUTES * 60000);
}

export const CANCEL_REASONS_CUSTOMER = [
  "غيرت رأيي",
  "وقت التوصيل طويل جداً",
  "خطأ في عنوان التوصيل",
  "أضفت وجبات بالخطأ",
  "وجدت بديلاً أفضل",
  "أخرى",
];

export const CANCEL_REASONS_STORE = [
  "نفاد المخزون",
  "المطبخ مغلق الآن",
  "طلب غير واضح / معلومات ناقصة",
  "خارج نطاق التوصيل",
  "عطل تقني",
  "أخرى",
];

export const CANCEL_REASONS_DRIVER = [
  "تعذر الوصول للعميل",
  "عنوان غير صحيح",
  "عطل في المركبة",
  "العميل غير متاح / لا يرد",
  "حالة طارئة",
  "أخرى",
];

export const SUPPORT_WHATSAPP = "97336119511";
