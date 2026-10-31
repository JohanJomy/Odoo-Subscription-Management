/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  RotateCw,
  Search,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';

export interface RevenueTotals {
  invoiced: number;
  collected: number;
  outstanding: number;
}

export interface RevenueGrowth {
  invoicedPercent: number | null;
  collectedPercent: number | null;
  outstandingPercent: number | null;
  collectionRateDiff?: number | null;
}

export interface MonthlySeriesPoint {
  month: string;
  invoiced: number;
  collected: number;
  outstanding: number;
  count: number;
}

export interface RevenueReportData {
  asOf: string;
  currency: string;
  filter: {
    from: string | null;
    to: string | null;
  };
  totals: RevenueTotals;
  previousPeriod: RevenueTotals & { collectionRate?: number };
  growth: RevenueGrowth;
  collectionRate: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  monthly: MonthlySeriesPoint[];
}

export interface AgeingBucketItem {
  count: number;
  amount: number;
}

export interface AgeingReportData {
  asOf: string;
  currency: string;
  totalOutstanding: number;
  rawBuckets?: {
    current: AgeingBucketItem;
    '1-30': AgeingBucketItem;
    '31-60': AgeingBucketItem;
    '61+': AgeingBucketItem;
  };
  buckets?: {
    current: AgeingBucketItem;
    '1-30': AgeingBucketItem;
    '31-60': AgeingBucketItem;
    '61+': AgeingBucketItem;
  };
  chartBuckets: Array<{
    bucket: string;
    amount: number;
    count: number;
    color: string;
  }>;
}

export interface CustomerHealthItem {
  customer: string;
  customerId: string;
  customerName: string;
  company: string | null;
  invoiceCount: number;
  outstanding: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
  health: 'HEALTHY' | 'WATCH' | 'AT_RISK' | string;
}

function formatRupeeCompact(paise: number): string {
  const rupees = Math.round(paise / 100);
  if (Math.abs(rupees) >= 10000000) return '₹' + (rupees / 10000000).toFixed(1) + 'Cr';
  if (Math.abs(rupees) >= 100000) return '₹' + (rupees / 100000).toFixed(1) + 'L';
  if (Math.abs(rupees) >= 1000) return '₹' + (rupees / 1000).toFixed(1) + 'K';
  return '₹' + rupees.toLocaleString('en-IN');
}

function formatMonthLabel(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex] || month} '${year.slice(2)}`;
}

export function ReportsClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refetchingRevenue, setRefetchingRevenue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [revenue, setRevenue] = useState<RevenueReportData | null>(null);
  const [ageing, setAgeing] = useState<AgeingReportData | null>(null);
  const [customers, setCustomers] = useState<CustomerHealthItem[]>([]);

  // Date filters
  const [dateFilter, setDateFilter] = useState<'ALL' | '30D' | '3M' | '6M' | 'CUSTOM'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Customer table search & health filter & pagination
  const [customerSearch, setCustomerSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'HEALTHY' | 'WATCH' | 'AT_RISK'>('ALL');
  const [customerPage, setCustomerPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all initial data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, ageRes, custRes] = await Promise.all([
        fetch('/api/v1/reports/revenue'),
        fetch('/api/v1/reports/overdue'),
        fetch('/api/v1/reports/customer-health'),
      ]);

      const [revJson, ageJson, custJson] = await Promise.all([
        revRes.json(),
        ageRes.json(),
        custRes.json(),
      ]);

      if (!revRes.ok) throw new Error(revJson.error?.message || 'Failed to load revenue data');
      if (!ageRes.ok) throw new Error(ageJson.error?.message || 'Failed to load overdue ageing data');
      if (!custRes.ok) throw new Error(custJson.error?.message || 'Failed to load customer health');

      setRevenue(revJson.data);
      setAgeing(ageJson.data);
      setCustomers(custJson.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Fetch only revenue when date filters change
  const fetchRevenue = useCallback(async (from?: string, to?: string) => {
    setRefetchingRevenue(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/v1/reports/revenue${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update revenue filter');
      setRevenue(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error applying date range');
    } finally {
      setRefetchingRevenue(false);
    }
  }, []);

  // Handle Preset Changes
  const handlePresetChange = (preset: 'ALL' | '30D' | '3M' | '6M' | 'CUSTOM') => {
    setDateFilter(preset);
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
      fetchRevenue();
    } else if (preset === '30D') {
      const from = new Date(today);
      from.setDate(today.getDate() - 30);
      const fromStr = from.toISOString().slice(0, 10);
      setFromDate(fromStr);
      setToDate(toStr);
      fetchRevenue(fromStr, toStr);
    } else if (preset === '3M') {
      const from = new Date(today);
      from.setMonth(today.getMonth() - 3);
      const fromStr = from.toISOString().slice(0, 10);
      setFromDate(fromStr);
      setToDate(toStr);
      fetchRevenue(fromStr, toStr);
    } else if (preset === '6M') {
      const from = new Date(today);
      from.setMonth(today.getMonth() - 6);
      const fromStr = from.toISOString().slice(0, 10);
      setFromDate(fromStr);
      setToDate(toStr);
      fetchRevenue(fromStr, toStr);
    }
  };

  const handleApplyCustom = () => {
    if (fromDate && toDate) {
      fetchRevenue(fromDate, toDate);
    }
  };

  // Donut data: Collected vs Outstanding
  const donutData = useMemo(() => {
    if (!revenue || !revenue.totals) return [];
    return [
      { name: 'Collected', value: revenue.totals.collected, color: '#10b981' },
      { name: 'Outstanding', value: revenue.totals.outstanding, color: '#f59e0b' },
    ];
  }, [revenue]);

  // Overdue chart data
  const overdueChartBuckets = useMemo(() => {
    if (ageing?.chartBuckets && ageing.chartBuckets.length > 0) {
      return ageing.chartBuckets;
    }
    const b = ageing?.rawBuckets || ageing?.buckets;
    if (!b) return [];
    const zeroToThirtyAmount = (b.current?.amount || 0) + (b['1-30']?.amount || 0);
    const zeroToThirtyCount = (b.current?.count || 0) + (b['1-30']?.count || 0);
    const thirtyOneToSixtyAmount = b['31-60']?.amount || 0;
    const thirtyOneToSixtyCount = b['31-60']?.count || 0;
    const sixtyPlusAmount = b['61+']?.amount || 0;
    const sixtyPlusCount = b['61+']?.count || 0;

    return [
      { bucket: '0–30 Days', amount: zeroToThirtyAmount, count: zeroToThirtyCount, color: '#10b981' },
      { bucket: '31–60 Days', amount: thirtyOneToSixtyAmount, count: thirtyOneToSixtyCount, color: '#f59e0b' },
      { bucket: '60+ Days', amount: sixtyPlusAmount, count: sixtyPlusCount, color: '#ef4444' },
    ];
  }, [ageing]);

  // Raw buckets map for the 4 stat cards
  const rawBuckets = useMemo(() => {
    return ageing?.rawBuckets || ageing?.buckets || {
      current: { count: 0, amount: 0 },
      '1-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61+': { count: 0, amount: 0 },
    };
  }, [ageing]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const q = customerSearch.toLowerCase();
      const matchesSearch =
        cust.customerName.toLowerCase().includes(q) ||
        (cust.company && cust.company.toLowerCase().includes(q)) ||
        cust.customerId.toLowerCase().includes(q);

      const matchesHealth = healthFilter === 'ALL' || cust.health === healthFilter;
      return matchesSearch && matchesHealth;
    });
  }, [customers, customerSearch, healthFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((customerPage - 1) * pageSize, customerPage * pageSize);

  // Initial Loading Skeleton
  if (loading && !revenue) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-8" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-4" />
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <BarChart3 className="h-4 w-4 text-indigo-600" /> Live reporting
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Revenue Analytics</h1>
          <p className="mt-1 text-xs text-slate-500">
            Revenue, collection performance, overdue ageing, and customer health from the ledger.
          </p>
        </div>

        {/* 7. Date-Range Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            {(['ALL', '30D', '3M', '6M', 'CUSTOM'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  dateFilter === preset
                    ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset === 'ALL'
                  ? 'All Time'
                  : preset === '30D'
                  ? 'Last 30D'
                  : preset === '3M'
                  ? 'Last 3M'
                  : preset === '6M'
                  ? 'Last 6M'
                  : 'Custom'}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (dateFilter === 'CUSTOM' && fromDate && toDate) {
                fetchRevenue(fromDate, toDate);
              } else {
                loadAllData();
              }
            }}
            disabled={loading || refetchingRevenue}
            title="Refresh reports"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refetchingRevenue ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* Custom Date Range Picker */}
      {dateFilter === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-medium text-indigo-950">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" /> Filter date range:
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!fromDate || !toDate || refetchingRevenue}
            className="rounded-md bg-indigo-600 px-3 py-1 font-medium text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadAllData()}
            className="font-medium text-red-700 underline hover:text-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {/* 8. KPI Cards with Comparison to Previous Period */}
      {revenue && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* KPI 1: Invoiced */}
          <KpiCard
            label="Invoiced"
            value={formatMoney(revenue.totals.invoiced)}
            previousValue={formatMoney(revenue.previousPeriod?.invoiced || 0)}
            growthPercent={revenue.growth?.invoicedPercent}
            growthType="positive-good"
            countSubtext={`${revenue.invoiceCount} invoices in period`}
          />

          {/* KPI 2: Collected */}
          <KpiCard
            label="Collected"
            value={formatMoney(revenue.totals.collected)}
            previousValue={formatMoney(revenue.previousPeriod?.collected || 0)}
            growthPercent={revenue.growth?.collectedPercent}
            growthType="positive-good"
            countSubtext={`${revenue.paidInvoiceCount} fully settled`}
          />

          {/* KPI 3: Outstanding */}
          <KpiCard
            label="Outstanding"
            value={formatMoney(revenue.totals.outstanding)}
            previousValue={formatMoney(revenue.previousPeriod?.outstanding || 0)}
            growthPercent={revenue.growth?.outstandingPercent}
            growthType="negative-good"
            countSubtext="Uncollected invoices"
          />

          {/* KPI 4: Collection Rate */}
          <KpiCard
            label="Collection Rate"
            value={`${revenue.collectionRate}%`}
            previousValue={
              revenue.previousPeriod?.collectionRate !== undefined
                ? `${revenue.previousPeriod.collectionRate}%`
                : undefined
            }
            growthPercent={revenue.growth?.collectionRateDiff}
            isDiffPoint
            growthType="positive-good"
            countSubtext="Realized cash conversion"
          />
        </div>
      )}

      {/* Charts Section: 1. Monthly Line Chart & 2. Collected vs Outstanding Donut */}
      {revenue && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 1. Monthly Revenue Line Chart */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-8 flex flex-col justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Monthly Revenue Trend</h2>
                <p className="text-xs text-slate-500">Invoiced vs. Collected monthly trajectory</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" /> Invoiced
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Collected
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="inline-block h-2 w-2 rounded-full border border-amber-500 bg-amber-100" /> Outstanding
                </span>
              </div>
            </div>

            <div className="mt-6 h-72 w-full">
              {mounted && revenue.monthly && revenue.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue.monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthLabel}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <YAxis
                      tickFormatter={formatRupeeCompact}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const point = payload[0].payload as MonthlySeriesPoint;
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs">
                            <p className="font-semibold text-slate-800">{formatMonthLabel(label as string)}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-indigo-600 font-medium">Invoiced:</span>
                                <span className="font-mono font-semibold">{formatMoney(point.invoiced)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-emerald-600 font-medium">Collected:</span>
                                <span className="font-mono font-semibold">{formatMoney(point.collected)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-amber-600 font-medium">Outstanding:</span>
                                <span className="font-mono font-semibold">{formatMoney(point.outstanding)}</span>
                              </div>
                              <div className="pt-1 mt-1 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                                <span>Invoices:</span>
                                <span>{point.count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="invoiced"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#6366f1' }}
                      activeDot={{ r: 5 }}
                      name="Invoiced"
                    />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#10b981' }}
                      activeDot={{ r: 5 }}
                      name="Collected"
                    />
                    <Line
                      type="monotone"
                      dataKey="outstanding"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: '#f59e0b' }}
                      name="Outstanding"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  {refetchingRevenue ? 'Updating trend...' : 'No monthly revenue records for this date range.'}
                </div>
              )}
            </div>
          </section>

          {/* 2. Collected vs Outstanding Chart */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Collection Split</h2>
              <p className="text-xs text-slate-500">Collected vs Outstanding distribution</p>
            </div>

            <div className="mt-4 relative h-48 w-full flex items-center justify-center">
              {mounted && revenue.totals && revenue.totals.invoiced > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={76}
                        paddingAngle={3}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatMoney(val as number), 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Metric */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono text-slate-900">{revenue.collectionRate}%</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Collected</span>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No invoice data recorded
                </div>
              )}
            </div>

            {/* Donut Legend */}
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Collected
                </span>
                <div className="text-right">
                  <span className="font-mono font-semibold text-slate-900">
                    {formatMoney(revenue.totals.collected)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-500">
                    ({revenue.totals.invoiced > 0 ? ((revenue.totals.collected / revenue.totals.invoiced) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Outstanding
                </span>
                <div className="text-right">
                  <span className="font-mono font-semibold text-slate-900">
                    {formatMoney(revenue.totals.outstanding)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-500">
                    ({revenue.totals.invoiced > 0 ? ((revenue.totals.outstanding / revenue.totals.invoiced) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 3. Visualise Overdue Ageing Buckets with a Bar Chart & Stat Cards */}
      {ageing && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Overdue Ageing Buckets</h2>
              <p className="text-xs text-slate-500">
                Unpaid invoices grouped by maturity. Total overdue portfolio:{' '}
                <span className="font-mono font-semibold text-slate-900">{formatMoney(ageing.totalOutstanding)}</span>
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">As of {ageing.asOf}</span>
          </div>

          {/* Ageing Bar Chart */}
          <div className="mt-4 h-56 w-full">
            {mounted && overdueChartBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overdueChartBuckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis tickFormatter={formatRupeeCompact} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                          <p className="font-semibold text-slate-800">{item.bucket}</p>
                          <p className="mt-1 font-mono font-bold text-slate-900">{formatMoney(item.amount)}</p>
                          <p className="text-[11px] text-slate-500">{item.count} invoices in this bucket</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {overdueChartBuckets.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading ageing chart...</div>
            )}
          </div>

          {/* Preserved 4 Bucket Stat Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(rawBuckets).map(([name, bucket]) => (
              <div key={name} className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {name === 'current' ? 'Current (Not Due)' : name === '61+' ? '61+ Days Past Due' : `${name} Days`}
                </p>
                <p className="mt-1 font-mono font-semibold text-slate-900">{formatMoney(bucket.amount)}</p>
                <p className="text-[11px] text-slate-500">{bucket.count} invoices</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4, 5, 6. Customer Health Table with Names, Badges, Overdue Counts & Clickable Rows */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Customer Health & Risk Radar</h2>
            </div>
            <p className="text-xs text-slate-500">
              Ranked by outstanding exposure, overdue count, and payment health. Click any customer to inspect account.
            </p>
          </div>

          {/* Health Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer or company..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerPage(1);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Health Filter Pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              {(['ALL', 'HEALTHY', 'WATCH', 'AT_RISK'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setHealthFilter(filter);
                    setCustomerPage(1);
                  }}
                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                    healthFilter === filter
                      ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All'
                    : filter === 'HEALTHY'
                    ? 'Healthy'
                    : filter === 'WATCH'
                    ? 'Watch'
                    : 'At Risk'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Health Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="pb-2.5 pl-1">Customer / Company</th>
                <th className="pb-2.5 text-center">Health Status</th>
                <th className="pb-2.5 text-center">Invoices</th>
                <th className="pb-2.5 text-center">Overdue Invoices</th>
                <th className="pb-2.5 text-right">Overdue Amount</th>
                <th className="pb-2.5 text-right pr-2">Total Outstanding</th>
                <th className="pb-2.5 text-right pr-1">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((c) => (
                  <tr
                    key={c.customerId}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    {/* 4 & 6. Customer Name & Clickable Row */}
                    <td className="py-3 pl-1">
                      <Link
                        href={`/customers/${c.customerId}`}
                        className="block group-hover:text-indigo-600 transition-colors"
                      >
                        <p className="font-semibold text-slate-900">{c.customerName}</p>
                        {c.company ? (
                          <p className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Building className="h-3 w-3 text-slate-400" />
                            {c.company}
                          </p>
                        ) : (
                          <p className="font-mono text-[10px] text-slate-400">{c.customerId}</p>
                        )}
                      </Link>
                    </td>

                    {/* 5. Clear Health Badge */}
                    <td className="py-3 text-center">
                      <HealthBadge health={c.health} />
                    </td>

                    {/* Total Invoices */}
                    <td className="py-3 text-center font-mono text-slate-700">
                      {c.invoiceCount}
                    </td>

                    {/* 5. Overdue Invoice Count */}
                    <td className="py-3 text-center">
                      {c.overdueInvoiceCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          {c.overdueInvoiceCount} overdue
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">0</span>
                      )}
                    </td>

                    {/* Overdue Amount */}
                    <td className="py-3 text-right font-mono">
                      {c.overdueAmount > 0 ? (
                        <span className="font-semibold text-rose-600">{formatMoney(c.overdueAmount)}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* Total Outstanding */}
                    <td className="py-3 text-right pr-2 font-mono font-semibold text-slate-900">
                      {formatMoney(c.outstanding)}
                    </td>

                    {/* 6. Clickable Customer Link */}
                    <td className="py-3 text-right pr-1">
                      <Link
                        href={`/customers/${c.customerId}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found matching the search or health filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row">
          <span>
            Showing {filteredCustomers.length === 0 ? 0 : (customerPage - 1) * pageSize + 1} to{' '}
            {Math.min(customerPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} accounts
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                disabled={customerPage === 1}
                className="rounded border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {customerPage} / {totalPages}
              </span>
              <button
                onClick={() => setCustomerPage((p) => Math.min(totalPages, p + 1))}
                disabled={customerPage === totalPages}
                className="rounded border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// 8. KPI Card Component with Growth / Previous Period Indicator
interface KpiCardProps {
  label: string;
  value: string;
  previousValue?: string;
  growthPercent?: number | null;
  growthType?: 'positive-good' | 'negative-good';
  isDiffPoint?: boolean;
  countSubtext?: string;
}

function KpiCard({
  label,
  value,
  previousValue,
  growthPercent,
  growthType = 'positive-good',
  isDiffPoint = false,
  countSubtext,
}: KpiCardProps) {
  let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
  let isPositive = false;

  if (growthPercent !== undefined && growthPercent !== null) {
    isPositive = growthPercent > 0;
    const isZero = growthPercent === 0;

    if (!isZero) {
      if (growthType === 'positive-good') {
        badgeColor = isPositive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200';
      } else {
        // negative-good (e.g. outstanding decreased is good)
        badgeColor = isPositive
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {growthPercent !== undefined && growthPercent !== null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border ${badgeColor}`}
          >
            {growthPercent > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : growthPercent < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {growthPercent > 0 ? '+' : ''}
            {growthPercent.toFixed(1)}
            {isDiffPoint ? ' pts' : '%'}
          </span>
        )}
      </div>

      <div className="mt-2">
        <p className="text-xl font-bold font-mono text-slate-900">{value}</p>
        {previousValue && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            vs. {previousValue} prior
          </p>
        )}
      </div>

      {countSubtext && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
          {countSubtext}
        </div>
      )}
    </div>
  );
}

// 5. Clear Health Badges (HEALTHY = green, WATCH = amber, AT_RISK = red)
function HealthBadge({ health }: { health: string }) {
  if (health === 'HEALTHY') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Healthy
      </span>
    );
  }
  if (health === 'WATCH') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3 text-amber-600" /> Watch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
      <AlertCircle className="h-3 w-3 text-rose-600" /> At Risk
    </span>
  );
}
