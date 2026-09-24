import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DriverRegisterPage() {
  const user = await getSessionUser();
  if (user?.role === "driver") redirect("/driver");

  return (
    <AuthScreen
      role="driver"
      title="التسجيل كمندوب توصيل"
      subtitle="أدخل بيانات الهوية والرخصة — حسابك يبقى قيد المراجعة حتى اعتماد الإدارة"
      successHref="/driver"
      accent="انضم لفريق لقمة"
    />
  );
}
