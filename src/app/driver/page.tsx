import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DriverDashboard } from "./DriverDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.role !== "driver") redirect("/driver/login");

  return (
    <DriverDashboard
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
    />
  );
}
