import { Prisma, type Invoice as PrismaInvoice, type Payment as PrismaPayment } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";

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
    method: payment.method as PaymentMethod,
    amount: payment.amount,
    paidOn: payment.paidOn.toISOString().slice(0, 10),
    note: payment.note,
    externalRef: payment.externalRef,
  };
}

function mapInvoice(invoice: InvoiceWithPayments): Invoice {
  return {
    id: invoice.id,
    number: invoice.number,
    customer: invoice.customerId,
    total: invoice.total,
    paidTotal: invoice.paidTotal,
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    status: invoice.status as InvoiceStatus,
    payments: invoice.payments.map(mapPayment),
  };
}

const invoiceInclude = { payments: { orderBy: { paidOn: "desc" as const } } };

export async function listInvoices(customerId?: string | null): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({
    where: customerId ? { customerId } : undefined,
    include: invoiceInclude,
    orderBy: { dueDate: "asc" },
  });
  return rows.map(mapInvoice);
}

export async function getInvoice(invoiceId: string, customerId?: string | null): Promise<Invoice> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...(customerId ? { customerId } : {}) },
    include: invoiceInclude,
  });
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
          await writeAudit(transaction, {
            action: "PAYMENT_IDEMPOTENCY_REPLAYED",
            entity: "Payment",
            entityId: existing.id,
            metadata: { externalRef: input.externalRef },
          });
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
      await writeAudit(transaction, {
        action: "PAYMENT_RECORDED",
        entity: "Payment",
        entityId: payment.id,
        metadata: { invoiceId, amount: payment.amount, method: payment.method, status: updated.status },
      });
      if (updated.status === "PAID") {
        await writeAudit(transaction, {
          action: "INVOICE_PAID",
          entity: "Invoice",
          entityId: invoiceId,
          metadata: { paymentId: payment.id },
        });
      }
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
  await writeAudit(prisma, {
    action: nextStatus === "CONFIRMED" ? "INVOICE_CONFIRMED" : "INVOICE_CANCELLED",
    entity: "Invoice",
    entityId: invoiceId,
    metadata: { previousStatus: invoice.status, nextStatus },
  });
  return mapInvoice(updated);
}
