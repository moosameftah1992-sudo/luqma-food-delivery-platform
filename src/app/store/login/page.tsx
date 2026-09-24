import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StoreLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "store") redirect("/store");

  return (
    <AuthScreen
      role="store"
      title="دخول شركاء لقمة 🏪"
      subtitle="لوحة إدارة المتجر — الدخول يتم ببيانات تصدرها الإدارة فقط"
      successHref="/store"
      allowRegister={false}
      accent="بوابة الشركاء"
      note={
        <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700">
          لا يوجد تسجيل عام. يتم إنشاء حساب متجرك من قبل الإدارة وتصلك البيانات
          عبر البريد الرسمي.
        </p>
      }
    />
  );
}
