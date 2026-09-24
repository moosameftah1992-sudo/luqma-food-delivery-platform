import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { StoreDashboard } from "./StoreDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.role !== "store") redirect("/store/login");
  if (!user.restaurantId) redirect("/store/login");

  return (
    <StoreDashboard
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        restaurantName: user.restaurantName,
      }}
    />
  );
}
