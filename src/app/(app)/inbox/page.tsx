"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  AlertTriangle,
  Calendar,
  Tag,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { formatMoney } from "@/lib/money";

interface InboxTask {
  id: string;
  type: "RENEWAL_DUE" | "INVOICE_OVERDUE" | "DISCOUNT_EXPIRING" | "QUOTE_EXPIRING";
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  amount?: number;
  entityId: string;
  entityType: "subscription" | "invoice" | "discount";
  dueDate: string;
  actionLabel: string;
  actionUrl: string;
}

interface InboxData {
  renewalsDueCount: number;
  overdueInvoicesCount: number;
  expiringDiscountsCount: number;
  expiringQuotesCount: number;
  totalTasks: number;
  tasks: InboxTask[];
}

export default function InboxPage() {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/reports/inbox");
      const json = await res.json();
      if (json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id));
  };

  const filteredTasks = (data?.tasks || []).filter((task) => {
    if (resolvedIds.has(task.id)) return false;
    if (filterType !== "ALL" && task.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Actionable Operations Queue</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-indigo-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Automated Dunning Watch
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Renewal & Dunning Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-prioritized queue: subscriptions expiring in 7 days, overdue invoices, expiring discounts, and pending proposals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInbox}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Tasks</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterType("INVOICE_OVERDUE")}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all ${
            filterType === "INVOICE_OVERDUE"
              ? "border-rose-300 bg-rose-50/50 ring-2 ring-rose-200"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              Overdue Actions
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-700 font-mono">
              {data?.overdueInvoicesCount ?? 0}
            </div>
            <p className="text-[11px] text-rose-600 mt-1">Confirmed & past due date</p>
          </div>
        </div>

        <div
          onClick={() => setFilterType("RENEWAL_DUE")}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all ${
            filterType === "RENEWAL_DUE"
              ? "border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Renewals Due (7d)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {data?.renewalsDueCount ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Expiring within 7 days</p>
          </div>
        </div>

        <div
          onClick={() => setFilterType("QUOTE_EXPIRING")}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all ${
            filterType === "QUOTE_EXPIRING"
              ? "border-amber-300 bg-amber-50/50 ring-2 ring-amber-200"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              Quotes Expiring (3d)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {data?.expiringQuotesCount ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Pending quotations</p>
          </div>
        </div>

        <div
          onClick={() => setFilterType("DISCOUNT_EXPIRING")}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all ${
            filterType === "DISCOUNT_EXPIRING"
              ? "border-emerald-300 bg-emerald-50/50 ring-2 ring-emerald-200"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
              Promo Expiring
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {data?.expiringDiscountsCount ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Campaign thresholds reached</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, clients, invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "INVOICE_OVERDUE", "RENEWAL_DUE", "QUOTE_EXPIRING", "DISCOUNT_EXPIRING"].map(
            (type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type === "ALL"
                  ? "All Tasks"
                  : type === "INVOICE_OVERDUE"
                  ? "Overdue"
                  : type === "RENEWAL_DUE"
                  ? "Renewals"
                  : type === "QUOTE_EXPIRING"
                  ? "Quotes"
                  : "Promos"}
              </button>
            )
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Tasks Queue ({filteredTasks.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Auto-generated from database triggers
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading inbox tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Inbox Zero Reached</h3>
            <p className="text-xs text-slate-500">
              No outstanding renewals, overdue items, or expiring discounts require action!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      task.severity === "HIGH"
                        ? "bg-rose-100 text-rose-600"
                        : task.severity === "MEDIUM"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {task.type === "INVOICE_OVERDUE" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : task.type === "RENEWAL_DUE" ? (
                      <Calendar className="h-4 w-4" />
                    ) : task.type === "QUOTE_EXPIRING" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Tag className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {task.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          task.severity === "HIGH"
                            ? "bg-rose-100 text-rose-700"
                            : task.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {task.severity}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Due: {task.dueDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {task.description}
                    </p>

                    {task.amount !== undefined && (
                      <p className="text-xs font-semibold text-slate-800 font-mono mt-1">
                        Amount: {formatMoney(task.amount)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:self-center">
                  <button
                    onClick={() => handleResolve(task.id)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
                  >
                    Resolve
                  </button>
                  <Link
                    href={task.actionUrl}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium transition-colors shadow-2xs"
                  >
                    <span>{task.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

