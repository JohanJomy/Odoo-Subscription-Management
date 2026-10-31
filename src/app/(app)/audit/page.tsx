"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Filter, RefreshCw, Clock, User, Tag, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLogItem {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userId?: string | null;
  detail?: string | null;
  at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/v1/audit?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load audit trail");
      }
      const json = await res.json();
      setLogs(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
      setTotalPages(json.meta?.totalPages ?? 1);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter]);

  const handleResetFilters = () => {
    setEntityFilter("");
    setActionFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Stitch Header with Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Settings & Administration</span>
            <span>/</span>
            <span className="text-slate-800">Audit Trail</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Audit Trail
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <ShieldAlert className="h-3 w-3 text-slate-500" />
              {total} Ledger Events
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={fetchLogs}
          className="text-xs h-9 px-3 rounded-lg text-slate-700 inline-flex items-center gap-1.5 self-start sm:self-auto bg-white shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Feed</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>Filter:</span>
        </div>

        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Entities</option>
          <option value="Subscription">Subscription</option>
          <option value="Invoice">Invoice</option>
          <option value="Payment">Payment</option>
          <option value="User">User</option>
          <option value="Product">Product</option>
          <option value="Plan">Plan</option>
          <option value="Discount">Discount</option>
          <option value="Tax">Tax</option>
          <option value="System">System</option>
        </select>

        <input
          type="text"
          placeholder="Filter by action (e.g. CREATE_STAFF)..."
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-lg border border-slate-300 px-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />

        {(entityFilter || actionFilter) && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Total recorded events: <strong className="text-slate-800">{total}</strong>
        </div>
      </div>

      {/* Audit Log Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-64 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No audit events match filters</h3>
            <p className="text-xs text-slate-500">
              Try clearing your entity or action filters above.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target Entity</th>
                    <th className="px-4 py-3">Actor / Trigger</th>
                    <th className="px-5 py-3">Audit Details & Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(log.at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{log.entity}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({log.entityId})</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.userId ? log.userId : "System / Scheduled"}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-slate-600 max-w-md truncate font-mono text-[11px]">
                        {log.detail ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-[#F8FAFC]">
                <span className="text-xs text-slate-500 font-medium">
                  Showing Page {page} of {totalPages} ({total} events)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs rounded-lg"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs rounded-lg"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
