import crypto from "node:crypto";

import { getInvoice } from "@/server/payments";

const apiBase = "https://api.razorpay.com/v1";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_NOT_CONFIGURED");
  return { keyId, keySecret };
}

function authorization(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: authorization(keyId, keySecret),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("RAZORPAY_REQUEST_FAILED");
  return response.json() as Promise<T>;
}

export async function createRazorpayOrder(invoiceId: string, customerId?: string | null) {
  const invoice = await getInvoice(invoiceId, customerId);
  const amount = invoice.total - invoice.paidTotal;
  if (amount <= 0) throw new Error("INVOICE_NOT_PAYABLE");
  const order = await razorpayRequest<{ id: string; amount: number; currency: string; status: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: invoice.number.slice(0, 40),
      notes: { invoiceId: invoice.id, invoiceNumber: invoice.number },
    }),
  });
  return {
    keyId: credentials().keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
  };
}

export async function verifyRazorpayPayment(input: {
  invoiceId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  customerId?: string | null;
}) {
  const invoice = await getInvoice(input.invoiceId, input.customerId);
  const expectedSignature = crypto
    .createHmac("sha256", credentials().keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(input.signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("RAZORPAY_SIGNATURE_INVALID");
  }
  const payment = await razorpayRequest<{
    id: string;
    order_id: string;
    amount: number;
    status: string;
    method: string;
  }>(`/payments/${encodeURIComponent(input.paymentId)}`);
  const balance = invoice.total - invoice.paidTotal;
  if (payment.order_id !== input.orderId || payment.amount !== balance || !["authorized", "captured"].includes(payment.status)) {
    throw new Error("RAZORPAY_PAYMENT_INVALID");
  }
  return { invoice, payment };
}
