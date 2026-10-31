import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getSession } from "@/server/auth/guard";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { customer: true },
  });

  if (!user || !user.active) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        name: user.customer?.name ?? user.email.split("@")[0],
        role: user.role as any,
      }}
    >
      {children}
    </AppShell>
  );
}

