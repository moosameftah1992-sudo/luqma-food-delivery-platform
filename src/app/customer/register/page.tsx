import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerRegisterPage() {
  const user = await getSessionUser();
  if (user?.role === "customer") redirect("/customer");

  return (
    <AuthScreen
      role="customer"
      title="إنشاء حساب عميل"
      subtitle="حساب جديد خلال ثوانٍ مع تأكيد البريد الإلكتروني"
      successHref="/customer"
      registerHref="/customer/register"
    />
  );
}
