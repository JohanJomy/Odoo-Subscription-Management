import { Download, Receipt } from "lucide-react";
import { redirect } from "next/navigation";

import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/guard";
import UpiPaymentPanel from "@/components/p4/upi-payment-panel";

export const dynamic = "force-dynamic";

export default async function CustomerInvoicesPage() {
  const user = await requireRole(["CUSTOMER", "ADMIN", "STAFF"]);
  const customerId =
    user.customerId ?? (await prisma.customer.findFirst({ select: { id: true } }))?.id;

  const invoices = customerId
    ? await prisma.invoice.findMany({
        where: { customerId },
        include: { payments: true },
        orderBy: { dueDate: "desc" },
      })
    : [];
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Receipt className="h-4 w-4 text-indigo-600" /> Customer portal</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">My Invoices &amp; Receipts</h1>
        <p className="mt-1 text-xs text-slate-500">Download your invoices and pay any outstanding balance securely by UPI.</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-indigo-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{invoices.map((invoice) => {
            const balance = invoice.total - invoice.paidTotal;
            return <tr key={invoice.id}><td className="px-4 py-3 font-mono font-semibold text-indigo-700">{invoice.number}</td><td className="px-4 py-3">{invoice.periodStart.toISOString().slice(0, 10)} - {invoice.periodEnd.toISOString().slice(0, 10)}</td><td className="px-4 py-3 font-mono">{formatMoney(invoice.total)}</td><td className="px-4 py-3 font-mono font-semibold">{formatMoney(balance)}</td><td className="px-4 py-3">{invoice.status}</td><td className="px-4 py-3"><div className="flex gap-2"><a className="inline-flex items-center gap-1 rounded-md border px-2 py-1" href={`/api/v1/invoices/${invoice.id}/pdf`}><Download className="h-3 w-3" /> PDF</a>{balance > 0 && <UpiPaymentPanel invoiceId={invoice.id} />}</div></td></tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
