/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  CreditCard,
  Receipt,
  Repeat,
  AlertCircle,
  RotateCw,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { StatusChip } from '@/components/shared/status-chip';

interface SummaryData {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  totalCustomers: number;
  revenueTotals: {
    invoiced: number;
    collected: number;
    outstanding: number;
  };
  collectionRate: number;
  subscriptionDistribution: Array<{
    status: string;
    name: string;
    count: number;
    color: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    paidOn: string;
    invoiceNumber: string;
    customerId: string;
  }>;
  recentInvoices: Array<{
    id: string;
    number: string;
    customerId: string;
    total: number;
    paidTotal: number;
    status: string;
    dueDate: string;
    createdAt: string;
  }>;
}

interface RevenueData {
  asOf: string;
  currency: string;
  filter: {
    from: string | null;
    to: string | null;
  };
  totals: {
    invoiced: number;
    collected: number;
    outstanding: number;
  };
  collectionRate: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  monthly: Array<{
    month: string;
    invoiced: number;
    collected: number;
    outstanding: number;
    count: number;
  }>;
}

interface OverdueData {
  asOf: string;
  currency: string;
  totalOutstanding: number;
  chartBuckets: Array<{
    bucket: string;
    amount: number;
    count: number;
    color: string;
  }>;
}

export function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [overdue, setOverdue] = useState<OverdueData | null>(null);

  // Date filters for revenue timeline
  const [dateFilter, setDateFilter] = useState<'ALL' | '3M' | '6M' | 'CUSTOM'>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      const revenueQuery = from || to ? `?from=${from || ''}&to=${to || ''}` : '';

      const [summaryRes, revenueRes, overdueRes] = await Promise.all([
        fetch('/api/v1/reports/summary'),
        fetch(`/api/v1/reports/revenue${revenueQuery}`),
        fetch('/api/v1/reports/overdue'),
      ]);

      const [summaryJson, revenueJson, overdueJson] = await Promise.all([
        summaryRes.json(),
        revenueRes.json(),
        overdueRes.json(),
      ]);

      if (!summaryRes.ok) throw new Error(summaryJson.error?.message || 'Failed to load summary');
      if (!revenueRes.ok) throw new Error(revenueJson.error?.message || 'Failed to load revenue');
      if (!overdueRes.ok) throw new Error(overdueJson.error?.message || 'Failed to load overdue');

      setSummary(summaryJson.data);
      setRevenue(revenueJson.data);
      setOverdue(overdueJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let from = '';
    let to = '';
    const now = new Date();

    if (dateFilter === '3M') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      from = d.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (dateFilter === '6M') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      from = d.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (dateFilter === 'CUSTOM') {
      from = fromDate;
      to = toDate;
    }

    fetchData(from, to);
  }, [dateFilter, fromDate, toDate, fetchData]);

  if (!mounted) {
    return (
      <div className="py-24 text-center">
        <RotateCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs text-slate-500">Initializing Revenue Radar...</p>
      </div>
    );
  }

  // Formatting helper for currency in tooltips
  const formatINR = (val: number) => formatMoney(val);

  // Collected vs Outstanding Pie data
  const collectedVsOutstandingData = revenue
    ? [
        { name: 'Collected', value: revenue.totals.collected, color: '#10b981' },
        { name: 'Outstanding', value: revenue.totals.outstanding, color: '#f59e0b' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Executive Analytics</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Revenue Radar Live
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Revenue Radar & Performance Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time MRR, collection velocity, subscription lifecycle distribution, and ageing debt analytics.
          </p>
        </div>

        {/* Date Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition ${
                dateFilter === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('3M')}
              className={`px-3 py-1.5 rounded-md transition ${
                dateFilter === '3M'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Last 3M
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('6M')}
              className={`px-3 py-1.5 rounded-md transition ${
                dateFilter === '6M'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Last 6M
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-md transition ${
                dateFilter === 'CUSTOM'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchData(fromDate, toDate)}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker when CUSTOM is selected */}
      {dateFilter === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <Filter className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">Filter Date Range:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="fromInput" className="text-slate-500">From:</label>
            <input
              id="fromInput"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="toInput" className="text-slate-500">To:</label>
            <input
              id="toInput"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchData(fromDate, toDate)}
            className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700"
          >
            Apply Filter
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            type="button"
            onClick={() => fetchData()}
            className="font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. MRR, ARR & Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Monthly Recurring (MRR)
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {summary ? formatMoney(summary.mrr) : '—'}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {summary?.activeSubscriptions ?? 0} Active Subs
              </span>
              <span>normalized monthly</span>
            </div>
          </div>
        </div>

        {/* ARR Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Annual Recurring (ARR)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">
              {summary ? formatMoney(summary.arr) : '—'}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Annual run-rate (MRR × 12)
            </p>
          </div>
        </div>

        {/* Invoiced & Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Total Invoiced
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {revenue ? formatMoney(revenue.totals.invoiced) : '—'}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-emerald-700">
                {revenue ? formatMoney(revenue.totals.collected) : '—'}
              </span>
              <span>collected</span>
            </div>
          </div>
        </div>

        {/* Outstanding & Collection Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Outstanding Debt
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-rose-600 font-mono tracking-tight">
              {revenue ? formatMoney(revenue.totals.outstanding) : '—'}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {revenue?.collectionRate ?? 0}% Rate
              </span>
              <span>recovery velocity</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2 & 3. Charts Row 1: Line Chart (MRR & Invoicing Trend) & Donut (Collected vs Outstanding) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line / Area Chart: Recurring Revenue Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Monthly Recurring Revenue & Collections Trend
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Monthly invoicing vs cash collected over selected billing cycles
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-indigo-600" /> Invoiced
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Collected
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <RotateCw className="h-5 w-5 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs">Loading revenue trend...</span>
              </div>
            ) : !revenue || revenue.monthly.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No billing history recorded for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenue.monthly}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${Math.round(val / 100000)}k`}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatINR(Number(value) || 0), '']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invoiced"
                    name="Invoiced"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#invoicedGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#collectedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart: Collected vs Outstanding */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-2">
            <h2 className="text-sm font-bold text-slate-900">Revenue Realization</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Collected vs outstanding invoice balances
            </p>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {loading ? (
              <RotateCw className="h-5 w-5 animate-spin text-indigo-600" />
            ) : !revenue || (revenue.totals.invoiced === 0) ? (
              <p className="text-xs text-slate-400">No invoice balance to display</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collectedVsOutstandingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {collectedVsOutstandingData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val) || 0), '']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-700">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Collected</span>
              <p className="font-bold text-emerald-700 font-mono">
                {revenue ? formatMoney(revenue.totals.collected) : '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Outstanding</span>
              <p className="font-bold text-amber-600 font-mono">
                {revenue ? formatMoney(revenue.totals.outstanding) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 & 5. Charts Row 2: Overdue Ageing Bar Chart & Subscription Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 4: Overdue Ageing Buckets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Overdue Invoice Ageing</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Outstanding balance grouped by days past invoice due date
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              Total: {overdue ? formatMoney(overdue.totalOutstanding) : '—'}
            </span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                <RotateCw className="h-5 w-5 animate-spin text-indigo-600 mr-2" />
                Loading ageing buckets...
              </div>
            ) : !overdue || overdue.chartBuckets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No overdue accounts detected.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overdue.chartBuckets}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${Math.round(val / 100000)}k`}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${formatINR(Number(val) || 0)} (${item.payload.count} invoices)`,
                      'Outstanding',
                    ]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {overdue.chartBuckets.map((entry, idx) => (
                      <Cell key={`bar-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 5: Subscription Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Subscription Lifecycle Distribution
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current active pipeline across all 5 discrete status states
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {summary?.totalSubscriptions ?? 0} Total
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading ? (
              <RotateCw className="h-5 w-5 animate-spin text-indigo-600" />
            ) : !summary || summary.subscriptionDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">No subscriptions created yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.subscriptionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {summary.subscriptionDistribution.map((entry, idx) => (
                      <Cell key={`sub-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} subscriptions`, 'Count']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val, entry: any) => (
                      <span className="text-xs text-slate-700">
                        {val} ({entry.payload.count})
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 6. Recent Payments & Recent Invoices Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Payment Collections</h3>
              </div>
              <Link
                href="/payments"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading payments...</div>
              ) : !summary || summary.recentPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No payments recorded yet.
                </div>
              ) : (
                summary.recentPayments.map((p) => (
                  <div key={p.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/60 transition">
                    <div>
                      <span className="font-semibold text-slate-900 block">{p.invoiceNumber}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(p.paidOn).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {p.method}
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        +{formatMoney(p.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-right">
            Verified UPI, Bank & Card settlements
          </div>
        </div>

        {/* Recent Invoices Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Generated Invoices</h3>
              </div>
              <Link
                href="/invoices"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading invoices...</div>
              ) : !summary || summary.recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No invoices generated yet.
                </div>
              ) : (
                summary.recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/60 transition">
                    <div>
                      <span className="font-semibold text-slate-900 block">{inv.number}</span>
                      <span className="text-[11px] text-slate-400">
                        Due: {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <StatusChip status={inv.status} />
                      <span className="font-mono font-bold text-slate-900">
                        {formatMoney(inv.total)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-right">
            Automated recurring cycle generation
          </div>
        </div>
      </div>
    </div>
  );
}
