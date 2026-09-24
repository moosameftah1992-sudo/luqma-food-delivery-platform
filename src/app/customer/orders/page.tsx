import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { OrdersView } from "./OrdersView";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") redirect("/customer/login");

  return (
    <OrdersView
      user={{ id: user.id, fullName: user.fullName, email: user.email, role: user.role }}
    />
  );
}
