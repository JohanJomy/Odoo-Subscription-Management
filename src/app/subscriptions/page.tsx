"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Subscription, SubscriptionStatus } from "@/lib/schemas";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";

export default function SubscriptionsListPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/subscriptions");
      const json = await res.json();
      if (json.success) {
        setSubscriptions(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleStatusChange = async (id: string, newStatus: SubscriptionStatus) => {
    try {
      const res = await fetch(`/api/v1/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to change status to ${newStatus}`);
      }
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: Column<Subscription>[] = [
    {
      key: "subscriptionNumber",
      header: "Subscription #",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
            {row.subscriptionNumber}
          </span>
          <div className="text-[11px] text-neutral-400">
            {new Date(row.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
            {row.customerName}
          </div>
          <div className="text-xs text-neutral-500 font-mono">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      key: "lines",
      header: "Products & Line Items",
      render: (row) => (
        <div className="text-xs space-y-1">
          {row.lines.map((l, i) => (
            <div key={i} className="text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold">{l.quantity}x</span> {l.productName}
              {l.variantName && (
                <span className="text-[11px] text-neutral-400 ml-1">
                  ({l.variantName})
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total (Server Computed)",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">
            ₹{(row.totalAmount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-400">
            {row.totalAmount} paise
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 text-xs">
          {row.status === "ACTIVE" && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange(row.id, "PAUSED")}
                className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(row.id, "CLOSED")}
                className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-red-500"
              >
                Close
              </button>
            </>
          )}

          {row.status === "PAUSED" && (
            <button
              type="button"
              onClick={() => handleStatusChange(row.id, "ACTIVE")}
              className="px-2 py-0.5 rounded border border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              Resume
            </button>
          )}

          {row.status === "CLOSED" && (
            <span className="text-neutral-400 italic">Closed</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Customer Subscriptions
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Active and archived subscriptions configured from product bundles, plans, taxes, and discounts.
          </p>
        </div>

        <Link
          href="/subscriptions/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-xs transition"
        >
          <span>+</span>
          <span>Create Subscription</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Subscriptions Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        isLoading={loading}
        title="Subscription Directory"
        description="All registered customer subscriptions and server-calculated totals"
        searchable
        searchPlaceholder="Search customer or subscription #..."
      />
    </div>
  );
}
