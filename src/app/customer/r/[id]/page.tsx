import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RestaurantView } from "./RestaurantView";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "customer") redirect("/customer/login");

  return (
    <RestaurantView
      restaurantId={Number(id)}
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
    />
  );
}
