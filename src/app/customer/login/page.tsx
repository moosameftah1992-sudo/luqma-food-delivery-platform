import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "customer") redirect("/customer");

  return (
    <AuthScreen
      role="customer"
      title="أهلاً بك في لقمة 👋"
      subtitle="سجل دخولك للاستمتاع بأفضل المطاعم حولك"
      successHref="/customer"
      registerHref="/customer/register"
    />
  );
}
