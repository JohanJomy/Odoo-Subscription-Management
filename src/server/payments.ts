import { Prisma, type Invoice as PrismaInvoice, type Payment as PrismaPayment } from "@prisma/client";
import { prisma } from "@/server/db";

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

type InvoiceWithPayments = PrismaInvoice & { payments: PrismaPayment[] };

function mapPayment(payment: PrismaPayment): Payment {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    method: payment.method,
    amount: payment.amount,
    paidOn: payment.paidOn,
    note: payment.note,
    externalRef: payment.externalRef,
  };
}

function mapInvoice(invoice: InvoiceWithPayments): Invoice {
  return {
    id: invoice.id,
    number: invoice.number,
    customer: invoice.customer,
    total: invoice.total,
    paidTotal: invoice.paidTotal,
    dueDate: invoice.dueDate,
    status: invoice.status,
    payments: invoice.payments.map(mapPayment),
  };
}

const invoiceInclude = { payments: { orderBy: { paidOn: "desc" as const } } };

export async function listInvoices(): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({ include: invoiceInclude, orderBy: { dueDate: "asc" } });
  return rows.map(mapInvoice);
}

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
  if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
  return mapInvoice(invoice);
}

export async function recordPayment(
  invoiceId: string,
  input: { method: PaymentMethod; amount: number; paidOn: string; note?: string; externalRef?: string },
): Promise<{ invoice: Invoice; payment: Payment; duplicate: boolean }> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new PaymentError("INVALID_AMOUNT", 422);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn) || input.paidOn > new Date().toISOString().slice(0, 10)) {
    throw new PaymentError("INVALID_DATE", 422);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      if (input.externalRef) {
        const existing = await transaction.payment.findUnique({ where: { externalRef: input.externalRef } });
        if (existing) {
          const invoice = await transaction.invoice.findUnique({ where: { id: existing.invoiceId }, include: invoiceInclude });
          if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
          return { invoice: mapInvoice(invoice), payment: mapPayment(existing), duplicate: true };
        }
      }

      const invoice = await transaction.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
      if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
      if (invoice.status !== "CONFIRMED") throw new PaymentError("INVOICE_NOT_PAYABLE", 409);
      if (input.amount > invoice.total - invoice.paidTotal) throw new PaymentError("OVERPAYMENT", 422);

      const payment = await transaction.payment.create({
        data: {
          id: `pay-${crypto.randomUUID()}`,
          invoiceId,
          method: input.method,
          amount: input.amount,
          paidOn: input.paidOn,
          note: input.note?.trim() || null,
          externalRef: input.externalRef || null,
        },
      });
      const paidTotal = invoice.paidTotal + payment.amount;
      const updated = await transaction.invoice.update({
        where: { id: invoiceId },
        data: { paidTotal, status: paidTotal === invoice.total ? "PAID" : "CONFIRMED" },
        include: invoiceInclude,
      });
      return { invoice: mapInvoice(updated), payment: mapPayment(payment), duplicate: false };
    });
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && input.externalRef) {
      return recordPayment(invoiceId, input);
    }
    throw error;
  }
}

export async function transitionInvoice(invoiceId: string, nextStatus: "CONFIRMED" | "CANCELLED"): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
  if (!invoice) throw new PaymentError("INVOICE_NOT_FOUND", 404);
  if (nextStatus === "CONFIRMED" && invoice.status !== "DRAFT") throw new PaymentError("INVOICE_NOT_PAYABLE", 409);
  if (nextStatus === "CANCELLED" && (!["DRAFT", "CONFIRMED"].includes(invoice.status) || invoice.paidTotal > 0)) {
    throw new PaymentError("INVOICE_NOT_PAYABLE", 409);
  }
  const updated = await prisma.invoice.update({ where: { id: invoiceId }, data: { status: nextStatus }, include: invoiceInclude });
  return mapInvoice(updated);
}
