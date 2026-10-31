"use client";

import { useState } from "react";

type Props = {
  invoiceId: string;
};

type PaymentRequest = {
  invoiceNumber: string;
  amount: number;
  vpa: string;
  merchantName: string;
  uri: string;
};

function formatAmount(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export default function UpiPaymentPanel({ invoiceId }: Props) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const show = async () => {
    setError("");
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/upi`, { cache: "no-store" });
      const result = await response.json() as { data?: PaymentRequest; error?: { code?: string } };
      if (!response.ok || !result.data) {
        setError(result.error?.code || "UPI_PAYMENT_UNAVAILABLE");
        return;
      }
      setPayment(result.data);
      setOpen(true);
    } catch {
      setError("UPI_PAYMENT_UNAVAILABLE");
    }
  };

  return (
    <>
      <button type="button" onClick={show} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-700">
        UPI
      </button>
      {error && <span className="text-[10px] text-red-600">{error}</span>}
      {open && payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="UPI payment">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-semibold text-slate-900">Pay by UPI</h2><p className="mt-1 text-xs text-slate-500">{payment.invoiceNumber} · {payment.merchantName}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500" aria-label="Close">✕</button>
            </div>
            <img className="mx-auto mt-4 h-64 w-64 rounded-lg border border-slate-200 p-2" src={`/api/v1/invoices/${invoiceId}/upi/qr`} alt={`UPI QR for ${payment.invoiceNumber}`} />
            <p className="mt-3 text-center text-lg font-bold text-slate-900">{formatAmount(payment.amount)}</p>
            <p className="mt-1 text-center text-xs text-slate-500">Scan with Google Pay, PhonePe, Paytm, or another UPI app.</p>
            <p className="mt-2 break-all text-center font-mono text-[10px] text-slate-500">{payment.vpa}</p>
            <a href={payment.uri} className="mt-4 block rounded-md bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white">Open UPI app</a>
            <a href={`/api/v1/invoices/${invoiceId}/upi/qr`} download={`${payment.invoiceNumber}-upi.png`} className="mt-2 block text-center text-xs text-indigo-700">Download QR</a>
          </div>
        </div>
      )}
    </>
  );
}
