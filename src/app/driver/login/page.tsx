import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DriverLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "driver") redirect("/driver");

  return (
    <AuthScreen
      role="driver"
      title="دخول مندوبي التوصيل 🛵"
      subtitle="استقبل الطلبات المتاحة وابدأ الكسب فوراً"
      successHref="/driver"
      registerHref="/driver/register"
      accent="واجهة المندوبين"
    />
  );
}
