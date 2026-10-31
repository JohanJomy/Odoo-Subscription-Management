import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/auth/guard";

export const dynamic = "force-dynamic";
export default async function PaymentsPage() {
  if ((await getSession())?.role === "CUSTOMER") redirect("/my/invoices");
  const payments = await prisma.payment.findMany({ orderBy: { paidOn: "desc" }, take: 200 });
  return <div className="space-y-6"><header><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><CreditCard className="h-4 w-4 text-indigo-600" /> Core treasury operations</div><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Payments &amp; Settlement Ledger</h1><p className="mt-1 text-xs text-slate-500">Verified UPI, bank, card, cash, and offline payment records.</p></header><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Metric label="Payments" value={String(payments.length)} /><Metric label="Settled volume" value={formatMoney(payments.reduce((sum, payment) => sum + payment.amount, 0))} /><Metric label="UPI volume" value={formatMoney(payments.filter((payment) => payment.method === "UPI").reduce((sum, payment) => sum + payment.amount, 0))} /></div><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-indigo-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Paid on</th><th className="px-4 py-3">Reference</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id}><td className="px-4 py-3 font-mono">{payment.invoiceId}</td><td className="px-4 py-3">{payment.method}</td><td className="px-4 py-3 font-mono font-semibold">{formatMoney(payment.amount)}</td><td className="px-4 py-3">{payment.paidOn.toISOString().slice(0, 10)}</td><td className="px-4 py-3">{payment.externalRef || "—"}</td></tr>)}</tbody></table></div></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-xl font-bold font-mono">{value}</p></div>; }
