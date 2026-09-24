import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { CheckoutView } from "./CheckoutView";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") redirect("/customer/login");

  return (
    <CheckoutView
      user={{ id: user.id, fullName: user.fullName, email: user.email, role: user.role }}
    />
  );
}
