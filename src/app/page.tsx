import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "CUSTOMER") {
    redirect("/my/subscriptions");
  }

  redirect("/dashboard");
}
