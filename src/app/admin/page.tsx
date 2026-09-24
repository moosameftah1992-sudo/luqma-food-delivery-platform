import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/admin/login");

  return (
    <AdminDashboard
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
    />
  );
}
