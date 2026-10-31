/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PlayCircle,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';

interface RunItem {
  subscriptionId: string;
  subscriptionNumber?: string;
  customerName?: string;
  periodStart?: string;
  periodEnd?: string;
  outcome: 'CREATED' | 'SKIPPED_EXISTS' | 'FAILED';
  invoiceNumber?: string;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
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

interface HistoricalRun {
  id: string;
  ranAt: string;
  ranById: string | null;
  created: number;
  skipped: number;
  failed: number;
  report: string;
}

export default function BillingRunCenterPage() {
  const [billingDate, setBillingDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [preview, setPreview] = useState<BillingSummary | null>(null);
  const [lastRunResult, setLastRunResult] = useState<BillingSummary | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table filter and pagination
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CREATED' | 'SKIPPED_EXISTS' | 'FAILED'>('ALL');
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 10;

  // History state
  const [history, setHistory] = useState<HistoricalRun[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedRunReport, setSelectedRunReport] = useState<RunItem[] | null>(null);

  const fetchPreview = useCallback(async () => {
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
      setError(err instanceof Error ? err.message : 'Network error fetching preview');
    } finally {
      setLoadingPreview(false);
    }
  }, [billingDate]);

  const fetchHistory = useCallback(async (page: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/v1/billing/runs?page=${page}&limit=5`);
      const json = await res.json();
      if (res.ok) {
        setHistory(json.data || []);
        if (json.meta) {
          setHistoryTotal(json.meta.total || 0);
        }
      }
    } catch {
      // ignore history load error gracefully
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    fetchHistory(historyPage);
  }, [fetchHistory, historyPage]);

  const executeBillingRun = async () => {
    setShowConfirm(false);
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/billing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: billingDate }),
      });
      const json = await res.json();
      if (res.ok) {
        setLastRunResult(json.data);
        setStatusFilter('ALL');
        setPreviewPage(1);
        // Refresh preview and history
        fetchPreview();
        fetchHistory(1);
        setHistoryPage(1);
      } else {
        setError(json.error?.message || 'Billing run failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error executing billing run');
    } finally {
      setRunning(false);
    }
  };

  const totalHistoryPages = Math.ceil(historyTotal / 5) || 1;
  const currentItems = lastRunResult ? lastRunResult.items : preview?.items ?? [];

  // Filter items based on selected tab
  const readyCount = currentItems.filter((i) => i.outcome === 'CREATED').length;
  const skippedCount = currentItems.filter((i) => i.outcome === 'SKIPPED_EXISTS').length;
  const failedCount = currentItems.filter((i) => i.outcome === 'FAILED').length;
  const failures = currentItems.filter((i) => i.outcome === 'FAILED');

  const filteredItems = currentItems.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.outcome === statusFilter;
  });

  const totalPreviewPages = Math.ceil(filteredItems.length / PREVIEW_PAGE_SIZE) || 1;
  const paginatedItems = filteredItems.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Core Operations</span>
            <span>•</span>
            <span className="text-indigo-600 font-semibold">Recurring Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing Run Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preview upcoming subscription renewals, generate batch invoices, and audit idempotent execution history.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <label htmlFor="billingDate" className="text-xs font-medium text-slate-600">
              Run Date:
            </label>
            <input
              id="billingDate"
              type="date"
              value={billingDate}
              onChange={(e) => {
                setBillingDate(e.target.value);
                setLastRunResult(null);
                setPreviewPage(1);
              }}
              disabled={running || loadingPreview}
              className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setLastRunResult(null);
              fetchPreview();
            }}
            disabled={running || loadingPreview}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-50 transition"
          >
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            {loadingPreview ? 'Refreshing...' : 'Preview Dry Run'}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={running || loadingPreview || (preview?.created === 0 && !lastRunResult)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs disabled:opacity-50 transition"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {running ? 'Running Engine...' : 'Run Billing'}
          </button>
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Error:</span> {error}
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-600 font-semibold hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. Billing Execution Result Summary Banner after Run */}
      {lastRunResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">
                Billing Execution Batch Completed for {billingDate}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Successfully created <strong className="text-emerald-700">{lastRunResult.created}</strong> new invoices totaling <strong className="text-indigo-700">{formatMoney(lastRunResult.totalAmount)}</strong>. Skipped {lastRunResult.skipped} duplicate cycles. {lastRunResult.failed > 0 ? `Encountered ${lastRunResult.failed} isolated failure(s).` : '100% clean run without errors.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLastRunResult(null);
              setStatusFilter('ALL');
              setPreviewPage(1);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            Back to Live Preview
          </button>
        </div>
      )}

      {/* Result Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">
            {lastRunResult ? 'Invoices Created' : 'Invoices Due (Preview)'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {lastRunResult ? lastRunResult.created : preview?.created ?? 0}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ready
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total Billed / Forecast</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-700">
              {formatMoney(lastRunResult ? lastRunResult.totalAmount : preview?.totalAmount ?? 0)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">INR</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Already Billed (Skipped)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-700">
              {lastRunResult ? lastRunResult.skipped : 0}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Idempotent
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Failed Isolated</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold ${
                (lastRunResult?.failed ?? 0) > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {lastRunResult ? lastRunResult.failed : 0}
            </span>
            {(lastRunResult?.failed ?? 0) > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Action Req
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Failure Details (if any failed) */}
      {failures.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>Isolated Subscription Failures ({failures.length})</span>
          </div>
          <div className="divide-y divide-rose-200/60 bg-white rounded-lg border border-rose-200 overflow-hidden text-xs">
            {failures.map((f, i) => (
              <div key={i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Link
                    href={`/subscriptions/${f.subscriptionId}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline"
                  >
                    {f.subscriptionNumber || f.subscriptionId}
                  </Link>
                  <span className="text-slate-500 ml-2">({f.customerName})</span>
                </div>
                <div className="text-rose-700 font-medium">{f.message || 'Unknown processing error'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table: Preview or Last Run Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {lastRunResult ? 'Execution Output Report' : 'Upcoming Invoice Preview (Dry Run)'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lastRunResult
                ? `Results of the billing execution completed for ${billingDate}`
                : `Simulated dry-run calculations for subscriptions due on or before ${billingDate}`}
            </p>
          </div>

          {/* 1. Status Filter Tabs (Ready, Already Billed, Failed) */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setPreviewPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              All ({currentItems.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('CREATED');
                setPreviewPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'CREATED'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Ready ({readyCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('SKIPPED_EXISTS');
                setPreviewPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'SKIPPED_EXISTS'
                  ? 'bg-slate-700 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Already Billed ({skippedCount})
            </button>
            {failedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('FAILED');
                  setPreviewPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition ${
                  statusFilter === 'FAILED'
                    ? 'bg-rose-600 text-white font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Failed ({failedCount})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Billing Period</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPreview ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Calculating upcoming billing schedule...</span>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">
                      {statusFilter === 'ALL'
                        ? 'All caught up!'
                        : `No ${statusFilter.toLowerCase()} items found.`}
                    </p>
                    <p className="text-xs mt-1">
                      {statusFilter === 'ALL'
                        ? `No subscriptions are due for billing on or before ${billingDate}.`
                        : 'Try changing the filter or selecting a different billing date.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    {/* 3. Clickable Subscription Number */}
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        href={`/subscriptions/${item.subscriptionId}`}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                        title="View Subscription Details"
                      >
                        {item.subscriptionNumber || item.subscriptionId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.customerName || '—'}</td>
                    {/* Repeated rows represent distinct valid billing periods */}
                    <td className="px-4 py-3 text-slate-500">
                      {item.periodStart
                        ? `${new Date(item.periodStart).toLocaleDateString('en-IN')} → ${
                            item.periodEnd ? new Date(item.periodEnd).toLocaleDateString('en-IN') : '—'
                          }`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(item.subtotal ?? item.total ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {item.discountTotal ? `-${formatMoney(item.discountTotal)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.taxTotal !== undefined ? formatMoney(item.taxTotal) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(item.total ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.outcome === 'CREATED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {lastRunResult ? 'Created' : 'Ready'}
                        </span>
                      ) : item.outcome === 'SKIPPED_EXISTS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="h-3 w-3" />
                          Already Billed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Preview Table Pagination */}
        {totalPreviewPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing {(previewPage - 1) * PREVIEW_PAGE_SIZE + 1}–{Math.min(previewPage * PREVIEW_PAGE_SIZE, filteredItems.length)} of {filteredItems.length} items (Page {previewPage} of {totalPreviewPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                disabled={previewPage <= 1 || loadingPreview}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                disabled={previewPage >= totalPreviewPages || loadingPreview}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Historical Runs Section with Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Execution History</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Historical record of automated cron and manual billing batch runs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Page {historyPage} of {totalHistoryPages}
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1 || loadingHistory}
                className="p-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage >= totalHistoryPages || loadingHistory}
                className="p-1.5 hover:bg-slate-50 border-l border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Skipped</th>
                <th className="px-5 py-3">Failed</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingHistory ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Loading historical runs...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No billing runs recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {new Date(run.ranAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-3 text-emerald-700 font-semibold">{run.created}</td>
                    <td className="px-5 py-3 text-slate-600">{run.skipped}</td>
                    <td className="px-5 py-3">
                      <span className={run.failed > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                        {run.failed}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(run.report);
                            setSelectedRunReport(parsed);
                          } catch {
                            setSelectedRunReport([]);
                          }
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Inspect Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Confirmation Dialog Modal before running billing */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Billing Execution</h3>
                <p className="text-xs text-slate-500">Run for date: {billingDate}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Invoices to Create:</span>
                <span className="font-bold text-slate-900">{preview?.created ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Billed Forecast:</span>
                <span className="font-bold text-indigo-700">
                  {formatMoney(preview?.totalAmount ?? 0)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Guaranteed idempotent: duplicate billing for previously invoiced cycles is rejected at database constraint level.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBillingRun}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition"
              >
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Report Inspection Modal */}
      {selectedRunReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Historical Batch Items</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRunReport(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {selectedRunReport.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No individual items recorded for this run.
                </div>
              ) : (
                selectedRunReport.map((item, i) => (
                  <div key={i} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <Link
                        href={`/subscriptions/${item.subscriptionId}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {item.subscriptionNumber || item.subscriptionId}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {item.customerName} {item.invoiceNumber ? `· ${item.invoiceNumber}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {item.total !== undefined ? formatMoney(item.total) : '—'}
                      </p>
                      <span
                        className={`text-[10px] font-semibold ${
                          item.outcome === 'CREATED'
                            ? 'text-emerald-600'
                            : item.outcome === 'SKIPPED_EXISTS'
                            ? 'text-slate-500'
                            : 'text-rose-600'
                        }`}
                      >
                        {item.outcome}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
