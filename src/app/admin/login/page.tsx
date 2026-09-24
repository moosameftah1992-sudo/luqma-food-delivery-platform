import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "admin") redirect("/admin");

  return (
    <AuthScreen
      role="admin"
      title="مركز تحكم لقمة 👑"
      subtitle="لوحة الأدمن الرئيسية — صلاحيات كاملة على المنصة"
      successHref="/admin"
      allowRegister={false}
      accent="مركز القيادة"
      note={
        <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700">
          الدخول حصري لحسابات الإدارة العليا.
        </p>
      }
    />
  );
}
