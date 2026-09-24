import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { CustomerHome } from "./CustomerHome";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") redirect("/customer/login");

  return (
    <CustomerHome
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
    />
  );
}
