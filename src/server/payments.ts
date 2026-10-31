export type InvoiceStatus = "DRAFT" | "CONFIRMED" | "PAID" | "CANCELLED";
export type PaymentMethod = "UPI" | "BANK" | "CARD" | "CASH";

export type Payment = {
  id: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  paidOn: string;
  note: string | null;
  externalRef: string | null;
};

export type Invoice = {
  id: string;
  number: string;
  customer: string;
  total: number;
  paidTotal: number;
  dueDate: string;
  status: InvoiceStatus;
  payments: Payment[];
};

export class PaymentError extends Error {
  constructor(
    public readonly code: "INVOICE_NOT_FOUND" | "INVOICE_NOT_PAYABLE" | "INVALID_AMOUNT" | "OVERPAYMENT" | "INVALID_DATE",
    public readonly status: 404 | 409 | 422,
  ) {
    super(code);
  }
}

const initialInvoices: Invoice[] = [
  { id: "inv-0412", number: "INV-2026-0412", customer: "Apex Logix India Pvt Ltd", total: 2450000, paidTotal: 0, dueDate: "2026-11-04", status: "CONFIRMED", payments: [] },
  { id: "inv-0182", number: "INV-2026-0182", customer: "Nexus Cloud Technologies", total: 1998300, paidTotal: 1998300, dueDate: "2026-10-01", status: "PAID", payments: [] },
  { id: "inv-draft", number: "INV-2026-DRAFT", customer: "Brightloop Demo Account", total: 125000, paidTotal: 0, dueDate: "2026-11-15", status: "DRAFT", payments: [] },
];

const invoices = new Map(initialInvoices.map((invoice) => [invoice.id, invoice]));
const paymentsByExternalRef = new Map<string, Payment>();

function cloneInvoice(invoice: Invoice): Invoice {
  return { ...invoice, payments: invoice.payments.map((payment) => ({ ...payment })) };
}

export function listInvoices(): Invoice[] {
  return [...invoices.values()].map(cloneInvoice);
}

export function getInvoice(invoiceId: string): Invoice {
  const invoice = invoices.get(invoiceId);
  if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
  return cloneInvoice(invoice);
}

export function recordPayment(
  invoiceId: string,
  input: { method: PaymentMethod; amount: number; paidOn: string; note?: string; externalRef?: string },
): { invoice: Invoice; payment: Payment; duplicate: boolean } {
  const invoice = invoices.get(invoiceId);
  if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
  if (input.externalRef) {
    const existing = paymentsByExternalRef.get(input.externalRef);
    if (existing) return { invoice: cloneInvoice(invoice), payment: { ...existing }, duplicate: true };
  }
  if (invoice.status !== "CONFIRMED") throw new PaymentError("INVOICE_NOT_PAYABLE", 409);
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new PaymentError("INVALID_AMOUNT", 422);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn) || input.paidOn > new Date().toISOString().slice(0, 10)) throw new PaymentError("INVALID_DATE", 422);
  const balance = invoice.total - invoice.paidTotal;
  if (input.amount > balance) throw new PaymentError("OVERPAYMENT", 422);
  const payment: Payment = {
    id: `pay-${crypto.randomUUID()}`,
    invoiceId,
    method: input.method,
    amount: input.amount,
    paidOn: input.paidOn,
    note: input.note?.trim() || null,
    externalRef: input.externalRef || null,
  };
  invoice.payments.push(payment);
  invoice.paidTotal += payment.amount;
  invoice.status = invoice.paidTotal === invoice.total ? "PAID" : "CONFIRMED";
  if (payment.externalRef) paymentsByExternalRef.set(payment.externalRef, payment);
  return { invoice: cloneInvoice(invoice), payment: { ...payment }, duplicate: false };
}

export function transitionInvoice(invoiceId: string, nextStatus: "CONFIRMED" | "CANCELLED"): Invoice {
  const invoice = invoices.get(invoiceId);
  if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
  if (nextStatus === "CONFIRMED" && invoice.status !== "DRAFT") throw new PaymentError("INVOICE_NOT_PAYABLE", 409);
  if (nextStatus === "CANCELLED" && (!["DRAFT", "CONFIRMED"].includes(invoice.status) || invoice.paidTotal > 0)) throw new PaymentError("INVOICE_NOT_PAYABLE", 409);
  invoice.status = nextStatus;
  return cloneInvoice(invoice);
}
