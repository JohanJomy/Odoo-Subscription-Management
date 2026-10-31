'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';

interface RunItem {
  subscriptionId: string;
  subscriptionNumber?: string;
  customerName?: string;
  periodStart?: string;
  periodEnd?: string;
  outcome: 'CREATED' | 'SKIPPED_EXISTS' | 'FAILED';
  invoiceNumber?: string;
  total?: number;
  message?: string;
}

interface BillingSummary {
  created: number;
  skipped: number;
  failed: number;
  totalAmount: number;
  items: RunItem[];
}

export default function BillingRunPage() {
  const [billingDate, setBillingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [preview, setPreview] = useState<BillingSummary | null>(null);
  const [lastRun, setLastRun] = useState<BillingSummary | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial preview on mount or date change
  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/billing/preview?date=${billingDate}`);
      const json = await res.json();
      if (res.ok) {
        setPreview({
          created: json.data.count,
          skipped: 0,
          failed: 0,
          totalAmount: json.data.totalAmount,
          items: json.data.items,
        });
      } else {
        setError(json.error?.message || 'Failed to fetch billing preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [billingDate]);

  const executeBillingRun = async () => {
    setRunning(true);
    setError(null);
    setShowConfirm(false);
    try {
      const res = await fetch('/api/v1/billing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: billingDate }),
      });
      const json = await res.json();
      if (res.ok) {
        setLastRun(json.data);
        // Refresh preview after run
        fetchPreview();
      } else {
        setError(json.error?.message || 'Billing run failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Billing Run Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Preview upcoming recurring billing cycles and execute idempotent invoice batch runs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm">
              <label htmlFor="date" className="text-xs font-semibold text-slate-600 uppercase">
                Billing Date:
              </label>
              <input
                id="date"
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                className="text-sm font-medium text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={running || (preview?.created === 0 && !loadingPreview)}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running Billing...' : 'Run Billing Now'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subscriptions Due
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {loadingPreview ? '...' : preview?.created ?? 0}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Total
            </span>
            <div className="text-2xl font-bold text-indigo-600 mt-2">
              {loadingPreview ? '...' : formatMoney(preview?.totalAmount ?? 0)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Last Run Created
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              {lastRun ? lastRun.created : '—'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Last Run Skipped (Idempotent)
            </span>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              {lastRun ? lastRun.skipped : '—'}
            </div>
          </div>
        </div>

        {/* Run Results Notification Banner */}
        {lastRun && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-2">
            <h3 className="font-semibold text-emerald-800 text-base">
              Billing Run Completed Successfully
            </h3>
            <p className="text-sm text-emerald-700">
              Created <strong>{lastRun.created}</strong> invoices ({formatMoney(lastRun.totalAmount)}), skipped{' '}
              <strong>{lastRun.skipped}</strong> existing periods, and encountered{' '}
              <strong>{lastRun.failed}</strong> failures.
            </p>
          </div>
        )}

        {/* Preview / Results Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-lg">
              {lastRun ? 'Latest Execution Report' : 'Upcoming Invoice Preview (Dry Run)'}
            </h2>
            <button
              onClick={fetchPreview}
              disabled={loadingPreview}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              {loadingPreview ? 'Refreshing...' : 'Refresh Preview'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Billing Period</th>
                  <th className="px-6 py-3">Outcome</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(lastRun ? lastRun.items : preview?.items)?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      No subscriptions currently due for billing on or before {billingDate}.
                    </td>
                  </tr>
                ) : (
                  (lastRun ? lastRun.items : preview?.items)?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {item.subscriptionNumber || item.subscriptionId}
                      </td>
                      <td className="px-6 py-4">{item.customerName || '—'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {item.periodStart ? new Date(item.periodStart).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.outcome === 'CREATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.outcome === 'SKIPPED_EXISTS'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.outcome === 'CREATED'
                            ? 'Ready / Created'
                            : item.outcome === 'SKIPPED_EXISTS'
                            ? 'Already Billed'
                            : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        {formatMoney(item.total ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900">Confirm Billing Execution</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to execute a billing run for <strong>{billingDate}</strong>. This will generate draft invoices for all due active subscriptions.
              </p>
              <div className="p-3 bg-indigo-50 text-indigo-900 rounded-lg text-xs leading-normal">
                <strong>Idempotent Guarantee:</strong> Any cycle previously billed will be automatically skipped with zero duplicate charges.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBillingRun}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Confirm & Execute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

