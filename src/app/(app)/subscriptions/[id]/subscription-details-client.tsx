'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Repeat,
  User,
  Layers,
  ArrowRight,
  Receipt,
  History,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  XCircle,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { StatusChip } from '@/components/shared/status-chip';

const STATUS_STEPS = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'] as const;

interface SubscriptionDetailsProps {
  subscription: {
    id: string;
    number: string;
    status: string;
    closeReason: string | null;
    startDate: string;
    expiryDate: string;
    paymentTerm: string;
    nextInvoiceDate: string | null;
    quoteValidUntil: string | null;
    customer: {
      id: string;
      name: string;
      company: string | null;
      phone: string | null;
    };
    plan: {
      id: string;
      name: string;
      price: number;
      billingPeriod: string;
      closable: boolean;
      pausable: boolean;
      renewable: boolean;
      autoClose: boolean;
    };
    lines: Array<{
      id: string;
      productId: string;
      variantId: string | null;
      description: string;
      qty: number;
      unitPrice: number;
      amount: number;
      product?: { id: string; name: string };
      variant?: { id: string; attribute: string; value: string };
    }>;
    invoices: Array<{
      id: string;
      number: string;
      status: string;
      periodStart: string;
      periodEnd: string;
      total: number;
      paidTotal: number;
      dueDate: string;
    }>;
    audit: Array<{
      id: string;
      action: string;
      detail: string;
      at: string;
      user?: { email: string };
    }>;
  };
  currentUserRole: string;
}

export function SubscriptionDetailsClient({
  subscription: initialSub,
  currentUserRole,
}: SubscriptionDetailsProps) {
  const router = useRouter();
  const [sub, setSub] = useState(initialSub);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal for Close / Pause / Renew
  const [transitionModal, setTransitionModal] = useState<{
    to: string;
    reason?: string;
    title: string;
    promptDate?: boolean;
    dateValue?: string;
  } | null>(null);

  // Edit DRAFT state
  const [isEditing, setIsEditing] = useState(false);
  const [editPaymentTerm, setEditPaymentTerm] = useState(sub.paymentTerm);
  const [editStartDate, setEditStartDate] = useState(
    new Date(sub.startDate).toISOString().split('T')[0]
  );
  const [editExpiryDate, setEditExpiryDate] = useState(
    new Date(sub.expiryDate).toISOString().split('T')[0]
  );
  const [savingEdit, setSavingEdit] = useState(false);

  const isStaffOrAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'STAFF';
  const currentStepIdx = STATUS_STEPS.indexOf(sub.status as (typeof STATUS_STEPS)[number]);

  // Pricing calculations
  const lineSubtotal = sub.lines.reduce((acc, line) => acc + line.amount, 0);
  const subtotalWithPlan = lineSubtotal + sub.plan.price;
  const estimatedTax = Math.round(subtotalWithPlan * 0.18);
  const estimatedTotal = subtotalWithPlan + estimatedTax;

  const handleTransition = async (to: string, reason?: string, expiryDate?: string) => {
    setLoadingAction(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/v1/subscriptions/${sub.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, reason, expiryDate }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMessage(`Status updated to ${to}${reason ? ` (${reason})` : ''}`);
        setTransitionModal(null);
        // Refresh data
        router.refresh();
        const refreshRes = await fetch(`/api/v1/subscriptions/${sub.id}`);
        const refreshJson = await refreshRes.json();
        if (refreshRes.ok) {
          setSub(refreshJson.data);
        }
      } else {
        setActionError(json.error?.message || 'Transition failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingEdit(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentTerm: editPaymentTerm,
          startDate: new Date(editStartDate).toISOString(),
          expiryDate: new Date(editExpiryDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMessage('Draft subscription updated successfully');
        setIsEditing(false);
        router.refresh();
        const refreshRes = await fetch(`/api/v1/subscriptions/${sub.id}`);
        const refreshJson = await refreshRes.json();
        if (refreshRes.ok) {
          setSub(refreshJson.data);
        }
      } else {
        setActionError(json.error?.message || 'Update failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{sub.number}</h1>
                <StatusChip status={sub.status} />
                {sub.closeReason && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    Reason: {sub.closeReason}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created for{' '}
                <Link
                  href={`/customers/${sub.customer.id}`}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  {sub.customer.name}
                </Link>
                {sub.customer.company ? ` (${sub.customer.company})` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {isStaffOrAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {sub.status === 'DRAFT' && !isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransition('QUOTATION')}
                    disabled={loadingAction}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs disabled:opacity-50"
                  >
                    Send Quotation
                  </button>
                </>
              )}

              {sub.status === 'QUOTATION' && (
                <button
                  type="button"
                  onClick={() => handleTransition('CONFIRMED')}
                  disabled={loadingAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm Quotation
                </button>
              )}

              {sub.status === 'CONFIRMED' && (
                <button
                  type="button"
                  onClick={() => handleTransition('ACTIVE')}
                  disabled={loadingAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs disabled:opacity-50"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Activate Now
                </button>
              )}

              {sub.status === 'ACTIVE' && (
                <>
                  {sub.plan.pausable && (
                    <button
                      type="button"
                      onClick={() =>
                        setTransitionModal({
                          to: 'CLOSED',
                          reason: 'PAUSED',
                          title: 'Pause Subscription',
                        })
                      }
                      disabled={loadingAction}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition disabled:opacity-50"
                    >
                      <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                      Pause
                    </button>
                  )}

                  {sub.plan.closable && (
                    <button
                      type="button"
                      onClick={() =>
                        setTransitionModal({
                          to: 'CLOSED',
                          reason: 'CLOSED_EARLY',
                          title: 'Close Subscription Early',
                        })
                      }
                      disabled={loadingAction}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Close Early
                    </button>
                  )}
                </>
              )}

              {sub.status === 'CLOSED' && sub.closeReason === 'PAUSED' && (
                <button
                  type="button"
                  onClick={() => handleTransition('ACTIVE')}
                  disabled={loadingAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Resume Subscription
                </button>
              )}

              {sub.status === 'CLOSED' && sub.closeReason === 'EXPIRED' && sub.plan.renewable && (
                <button
                  type="button"
                  onClick={() => {
                    const nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    setTransitionModal({
                      to: 'ACTIVE',
                      title: 'Renew Subscription',
                      promptDate: true,
                      dateValue: nextYear.toISOString().split('T')[0],
                    });
                  }}
                  disabled={loadingAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Renew
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback Banners */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="flex-1">{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="font-bold hover:underline"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="flex-1">{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="font-bold hover:underline"
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Stepper */}
        <div className="py-2">
          <div className="flex items-center justify-between w-full relative">
            {/* Background connecting line */}
            <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0" />

            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isPast
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : isCurrent
                        ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold text-center ${
                      isCurrent
                        ? 'text-indigo-600 font-bold'
                        : isPast
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Mode Sheet for DRAFT status */}
      {isEditing && (
        <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-900">Edit Draft Settings</h3>
            <span className="text-[11px] text-indigo-600">Editing is locked once moved to Quotation</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Term</label>
              <select
                value={editPaymentTerm}
                onChange={(e) => setEditPaymentTerm(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="IMMEDIATE">IMMEDIATE</option>
                <option value="NET15">NET15 (15 Days)</option>
                <option value="NET30">NET30 (30 Days)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Start Date</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Expiry Date</label>
              <input
                type="date"
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingEdit}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs disabled:opacity-50"
            >
              {savingEdit ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      )}

      {/* Details Grid: Customer & Plan info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
            <User className="h-4 w-4 text-indigo-600" />
            <span>Customer Profile</span>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Name:</span>
              <span className="font-semibold text-slate-900">{sub.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Company:</span>
              <span className="font-medium text-slate-800">{sub.customer.company || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="font-medium text-slate-800">{sub.customer.phone || '—'}</span>
            </div>
            <div className="pt-2">
              <Link
                href={`/customers/${sub.customer.id}`}
                className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
              >
                View full customer details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Plan & Term Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Plan & Schedule</span>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan:</span>
              <span className="font-semibold text-slate-900">{sub.plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cadence:</span>
              <span className="font-semibold text-indigo-700">{sub.plan.billingPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Term:</span>
              <span className="font-medium text-slate-800">{sub.paymentTerm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Invoice Date:</span>
              <span className="font-semibold text-slate-900">
                {sub.nextInvoiceDate
                  ? new Date(sub.nextInvoiceDate).toLocaleDateString('en-IN')
                  : 'None scheduled'}
              </span>
            </div>
            <div className="flex gap-1.5 pt-1">
              {sub.plan.pausable && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-medium">
                  Pausable
                </span>
              )}
              {sub.plan.closable && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                  Closable
                </span>
              )}
              {sub.plan.renewable && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-medium">
                  Renewable
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Lines & Pricing Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Subscription Products & Pricing Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-2.5">Item Description</th>
                <th className="px-5 py-2.5 text-center">Qty</th>
                <th className="px-5 py-2.5 text-right">Unit Price</th>
                <th className="px-5 py-2.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sub.plan.price > 0 && (
                <tr className="bg-indigo-50/20">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {sub.plan.name} (Recurring Plan Base Fee)
                  </td>
                  <td className="px-5 py-3 text-center text-slate-500">1</td>
                  <td className="px-5 py-3 text-right">{formatMoney(sub.plan.price)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(sub.plan.price)}
                  </td>
                </tr>
              )}
              {sub.lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                    No custom product lines on this subscription.
                  </td>
                </tr>
              ) : (
                sub.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{line.description}</td>
                    <td className="px-5 py-3 text-center font-mono">{line.qty}</td>
                    <td className="px-5 py-3 text-right">{formatMoney(line.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(line.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatMoney(subtotalWithPlan)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Tax (18%):</span>
              <span className="font-semibold text-slate-900">{formatMoney(estimatedTax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-bold text-indigo-900">
              <span>Cycle Total:</span>
              <span>{formatMoney(estimatedTotal)}</span>
            </div>
            <p className="text-[10px] text-slate-400 text-right pt-1">
              Exact discounts & tax apportioned dynamically at billing run execution
            </p>
          </div>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Generated Invoices Ledger ({sub.invoices.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-2.5">Invoice #</th>
                <th className="px-5 py-2.5">Billing Period</th>
                <th className="px-5 py-2.5">Due Date</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sub.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No invoices generated yet for this subscription.
                  </td>
                </tr>
              ) : (
                sub.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3 font-semibold text-slate-900">{inv.number}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(inv.periodStart).toLocaleDateString('en-IN')} →{' '}
                      {new Date(inv.periodEnd).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3">
                      <StatusChip status={inv.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(inv.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Subscription Audit Trail ({sub.audit.length})
          </h2>
        </div>

        <div className="p-5">
          {sub.audit.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No audit logs recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {sub.audit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.at).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transition Modal (Pause, Close Early, Renew) */}
      {transitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{transitionModal.title}</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to transition subscription <strong>{sub.number}</strong> to{' '}
              <strong>{transitionModal.to}</strong>
              {transitionModal.reason ? ` (${transitionModal.reason})` : ''}?
            </p>

            {transitionModal.promptDate && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New Expiry Date:</label>
                <input
                  type="date"
                  value={transitionModal.dateValue}
                  onChange={(e) =>
                    setTransitionModal({ ...transitionModal, dateValue: e.target.value })
                  }
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTransitionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleTransition(
                    transitionModal.to,
                    transitionModal.reason,
                    transitionModal.dateValue
                  )
                }
                disabled={loadingAction}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs disabled:opacity-50"
              >
                {loadingAction ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

