import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (session?.role === "CUSTOMER") redirect("/my/invoices");

  return <ReportsClient />;
}
