import { Repeat } from "lucide-react";
import { requireRole } from "@/server/auth/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerSubscriptionsPage() {
  const user = await requireRole(["CUSTOMER"]);
  const subscriptions = user.customerId ? await prisma.subscription.findMany({
    where: { customerId: user.customerId },
    include: { plan: true },
    orderBy: { expiryDate: "asc" },
  }) : [];
  return <div className="space-y-6"><header><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Repeat className="h-4 w-4 text-indigo-600" /> Customer portal</div><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">My Subscriptions</h1><p className="mt-1 text-xs text-slate-500">Review your active plans, billing period, and renewal dates.</p></header><div className="grid gap-4 md:grid-cols-2">{subscriptions.map((subscription) => <article key={subscription.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{subscription.number}</h2><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">{subscription.status}</span></div><p className="mt-3 text-sm text-slate-700">{subscription.plan.name}</p><p className="mt-1 text-xs text-slate-500">{subscription.startDate.toISOString().slice(0, 10)} - {subscription.expiryDate.toISOString().slice(0, 10)}</p></article>)}</div></div>;
}
