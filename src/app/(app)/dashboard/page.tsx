import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "CUSTOMER") {
    redirect("/my/subscriptions");
  }

  return <DashboardClient />;
}
