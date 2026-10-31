import { listInvoices, type Invoice } from "@/server/payments";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysOverdue(dueDate: string, asOf = today()): number {
  const difference = Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`);
  return Math.max(0, Math.floor(difference / 86400000));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export async function revenueReport() {
  const invoices = await listInvoices();
  const active = invoices.filter((invoice) => invoice.status !== "CANCELLED");
  const invoiced = sum(active.map((invoice) => invoice.total));
  const collected = sum(active.map((invoice) => invoice.paidTotal));
  const outstanding = invoiced - collected;
  const paidInvoices = active.filter((invoice) => invoice.status === "PAID").length;
  return {
    asOf: today(),
    currency: "INR",
    totals: { invoiced, collected, outstanding },
    collectionRate: invoiced === 0 ? 0 : Number(((collected / invoiced) * 100).toFixed(2)),
    invoiceCount: active.length,
    paidInvoiceCount: paidInvoices,
  };
}

export async function ageingReport() {
  const invoices = await listInvoices();
  const unpaid = invoices.filter((invoice) => !["PAID", "CANCELLED"].includes(invoice.status) && invoice.total > invoice.paidTotal);
  const buckets = {
    current: { count: 0, amount: 0 },
    "1-30": { count: 0, amount: 0 },
    "31-60": { count: 0, amount: 0 },
    "61+": { count: 0, amount: 0 },
  };
  for (const invoice of unpaid) {
    const overdue = daysOverdue(invoice.dueDate);
    const bucket = overdue === 0 ? buckets.current : overdue <= 30 ? buckets["1-30"] : overdue <= 60 ? buckets["31-60"] : buckets["61+"];
    bucket.count += 1;
    bucket.amount += invoice.total - invoice.paidTotal;
  }
  return { asOf: today(), currency: "INR", totalOutstanding: sum(Object.values(buckets).map((bucket) => bucket.amount)), buckets };
}

export async function customerHealthReport() {
  const invoices = await listInvoices();
  const grouped = new Map<string, Invoice[]>();
  for (const invoice of invoices) grouped.set(invoice.customer, [...(grouped.get(invoice.customer) || []), invoice]);
  return [...grouped.entries()].map(([customer, customerInvoices]) => {
    const outstanding = sum(customerInvoices.map((invoice) => Math.max(0, invoice.total - invoice.paidTotal)));
    const overdue = customerInvoices.filter((invoice) => invoice.total > invoice.paidTotal && daysOverdue(invoice.dueDate) > 0);
    const overdueAmount = sum(overdue.map((invoice) => Math.max(0, invoice.total - invoice.paidTotal)));
    const health = outstanding === 0 ? "HEALTHY" : overdueAmount > 0 ? "AT_RISK" : "WATCH";
    return {
      customer,
      invoiceCount: customerInvoices.length,
      outstanding,
      overdueAmount,
      overdueInvoiceCount: overdue.length,
      health,
    };
  }).sort((left, right) => right.outstanding - left.outstanding);
}
