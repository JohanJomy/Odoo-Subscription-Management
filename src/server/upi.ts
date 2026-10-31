import { getInvoice, type Invoice } from "@/server/payments";

const merchantVpa = process.env.UPI_MERCHANT_VPA || process.env.UPI_VPA || "loopledger@icici";
const merchantName = process.env.UPI_MERCHANT_NAME || "LoopLedger Technologies Pvt Ltd";

export type UpiPaymentRequest = {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  vpa: string;
  merchantName: string;
  uri: string;
};

function encode(value: string): string {
  return encodeURIComponent(value);
}

export function createUpiRequest(invoice: Invoice): UpiPaymentRequest {
  const balance = invoice.total - invoice.paidTotal;
  if (balance <= 0) throw new Error("INVOICE_NOT_PAYABLE");
  const amount = (balance / 100).toFixed(2);
  const uri = `upi://pay?pa=${encode(merchantVpa)}&pn=${encode(merchantName)}&am=${amount}&cu=INR&tn=${encode(invoice.number)}`;
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    amount: balance,
    vpa: merchantVpa,
    merchantName,
    uri,
  };
}

export async function getUpiRequest(invoiceId: string, customerId?: string | null): Promise<UpiPaymentRequest> {
  return createUpiRequest(await getInvoice(invoiceId, customerId));
}
