import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, active: true },
  });

  if (!user || !user.active) {
    redirect("/login?reset=1");
  }

  if (session.role === "CUSTOMER") {
    redirect("/my/subscriptions");
  }

  redirect("/dashboard");
}
