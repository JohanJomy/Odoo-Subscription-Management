"use client";

import { FormEvent, useEffect, useState } from "react";

type Props = {
  invoiceId: string;
  balance: number;
};

type QueuedPayment = {
  invoiceId: string;
  method: string;
  amount: number;
  paidOn: string;
  externalRef: string;
};

const QUEUE_KEY = "loopledger:p4:payment-queue";

function readQueue(): QueuedPayment[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) as QueuedPayment[] : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedPayment[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export default function RecordPaymentForm({ invoiceId, balance }: Props) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("UPI");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [externalRef, setExternalRef] = useState("");
  const [message, setMessage] = useState("");
  const [queued, setQueued] = useState(0);

  const syncQueue = async () => {
    const queue = readQueue();
    const remaining: QueuedPayment[] = [];
    for (const payment of queue) {
      try {
        const response = await fetch(`/api/v1/invoices/${payment.invoiceId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": payment.externalRef },
          body: JSON.stringify(payment),
        });
        if (!response.ok && response.status !== 409) remaining.push(payment);
      } catch {
        remaining.push(payment);
      }
    }
    saveQueue(remaining);
    setQueued(remaining.length);
    if (queue.length !== remaining.length) setMessage("Queued payments synced.");
  };

  useEffect(() => {
    setQueued(readQueue().length);
    window.addEventListener("online", syncQueue);
    return () => window.removeEventListener("online", syncQueue);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payment: QueuedPayment = {
      invoiceId,
      method,
      amount: Number(amount),
      paidOn,
      externalRef: externalRef.trim() || `offline-${crypto.randomUUID()}`,
    };
    if (!Number.isInteger(payment.amount) || payment.amount <= 0 || payment.amount > balance) {
      setMessage("Enter a valid amount in paise within the invoice balance.");
      return;
    }
    if (!navigator.onLine) {
      const queue = [...readQueue(), payment];
      saveQueue(queue);
      setQueued(queue.length);
      setMessage("Offline: payment queued and will sync when connection returns.");
      return;
    }
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": payment.externalRef },
        body: JSON.stringify(payment),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: { code?: string } };
        setMessage(`Payment failed: ${result.error?.code || "UNKNOWN_ERROR"}`);
        return;
      }
      setMessage("Payment recorded. Refresh to see the updated balance.");
      setExternalRef("");
    } catch {
      const queue = [...readQueue(), payment];
      saveQueue(queue);
      setQueued(queue.length);
      setMessage("Connection lost: payment queued for retry.");
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Payment amount in paise" value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs" inputMode="numeric" />
        <select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs">
          <option>UPI</option><option>BANK</option><option>CARD</option><option>CASH</option>
        </select>
        <input aria-label="Payment date" type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs" />
        <input aria-label="External payment reference" placeholder="Reference (optional)" value={externalRef} onChange={(event) => setExternalRef(event.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs" />
      </div>
      <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Record payment</button>
      {queued > 0 && <button type="button" onClick={syncQueue} className="ml-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs">Sync {queued} queued</button>}
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </form>
  );
}
