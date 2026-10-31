"use client";

import React, { useState, useEffect } from "react";
import { Discount, DiscountType, DiscountTarget, UserRole } from "@/lib/schemas";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { FormField } from "@/components/shared/FormField";

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role
  const [role, setRole] = useState<UserRole>("ADMIN");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DiscountType>("PERCENTAGE");
  const [percentageValue, setPercentageValue] = useState<number>(10); // 10%
  const [fixedValuePaise, setFixedValuePaise] = useState<number>(50000); // ₹500
  const [target, setTarget] = useState<DiscountTarget>("SUBSCRIPTION");
  const [minPurchasePaise, setMinPurchasePaise] = useState<number>(500000); // ₹5,000
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [maxUsageLimit, setMaxUsageLimit] = useState<number>(100);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0]
  );
  const [formError, setFormError] = useState("");

  const updateRole = () => {
    const saved = localStorage.getItem("loopledger_user_role") as UserRole;
    if (saved) setRole(saved);
  };

  useEffect(() => {
    updateRole();
    window.addEventListener("roleChanged", updateRole);
    return () => window.removeEventListener("roleChanged", updateRole);
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/discounts");
      const json = await res.json();
      if (json.success) {
        setDiscounts(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load discounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const openCreateModal = () => {
    if (role !== "ADMIN") {
      alert("Staff restriction: Staff cannot create or modify discounts. Switch to Admin in the navbar.");
      return;
    }
    setEditingDiscount(null);
    setName("");
    setCode("");
    setDescription("");
    setType("PERCENTAGE");
    setPercentageValue(10);
    setFixedValuePaise(50000);
    setTarget("SUBSCRIPTION");
    setMinPurchasePaise(500000);
    setMinQuantity(1);
    setMaxUsageLimit(100);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0]);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (d: Discount) => {
    if (role !== "ADMIN") {
      alert("Staff restriction: Staff cannot create or modify discounts. Switch to Admin in the navbar.");
      return;
    }
    setEditingDiscount(d);
    setName(d.name);
    setCode(d.code);
    setDescription(d.description || "");
    setType(d.type);
    if (d.type === "PERCENTAGE") {
      setPercentageValue(d.value);
    } else {
      setFixedValuePaise(d.value);
    }
    setTarget(d.target);
    setMinPurchasePaise(d.minPurchaseAmount || 0);
    setMinQuantity(d.minQuantity || 1);
    setMaxUsageLimit(d.maxUsageLimit || 100);
    setStartDate(d.startDate.split("T")[0]);
    setEndDate(d.endDate.split("T")[0]);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) return setFormError("Discount name is required");
    if (!code.trim()) return setFormError("Discount code is required");

    if (type === "PERCENTAGE") {
      if (percentageValue <= 0 || percentageValue > 100) {
        return setFormError("Percentage discount cannot exceed 100% and must be > 0");
      }
    } else {
      if (fixedValuePaise <= 0) {
        return setFormError("Fixed discount amount must be greater than 0");
      }
    }

    if (new Date(endDate) < new Date(startDate)) {
      return setFormError("End date cannot be earlier than start date");
    }

    try {
      const payload = {
        name,
        code,
        description: description || undefined,
        type,
        value: type === "PERCENTAGE" ? percentageValue : fixedValuePaise,
        target,
        minPurchaseAmount: minPurchasePaise > 0 ? minPurchasePaise : null,
        minQuantity: minQuantity > 0 ? minQuantity : null,
        maxUsageLimit: maxUsageLimit > 0 ? maxUsageLimit : null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        active: editingDiscount ? editingDiscount.active : true,
      };

      const url = editingDiscount
        ? `/api/v1/discounts/${editingDiscount.id}`
        : "/api/v1/discounts";
      const method = editingDiscount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save discount");
      }

      setIsModalOpen(false);
      fetchDiscounts();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const columns: Column<Discount>[] = [
    {
      key: "code",
      header: "Code & Name",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {row.code}
          </span>
          <div className="font-medium text-xs text-neutral-800 dark:text-neutral-200 mt-1">
            {row.name}
          </div>
        </div>
      ),
    },
    {
      key: "value",
      header: "Discount Value",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
            {row.type === "PERCENTAGE"
              ? `${row.value}% OFF`
              : `₹${(row.value / 100).toLocaleString()} OFF`}
          </div>
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
            Applies to {row.target.toLowerCase()}
          </div>
        </div>
      ),
    },
    {
      key: "rules",
      header: "Conditions & Rules",
      render: (row) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-0.5">
          {row.minPurchaseAmount && (
            <div>
              Min Spend: ₹{(row.minPurchaseAmount / 100).toLocaleString()} ({row.minPurchaseAmount} paise)
            </div>
          )}
          {row.minQuantity && <div>Min Qty: {row.minQuantity} items</div>}
          <div>
            Usage: {row.currentUsageCount || 0}
            {row.maxUsageLimit ? ` / ${row.maxUsageLimit}` : " (Unlimited)"}
          </div>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Validity Period",
      render: (row) => (
        <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          <div>{new Date(row.startDate).toLocaleDateString()}</div>
          <div className="text-[10px] text-neutral-400">to {new Date(row.endDate).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (row) => <StatusChip status={row.active ? "Active" : "Inactive"} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {role === "ADMIN" ? (
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Edit
            </button>
          ) : (
            <span className="text-xs text-neutral-400 italic">Read-only (Staff)</span>
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
            Discount Campaigns
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Percentage (≤ 100%) and fixed-amount discounts with usage limits and date constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === "STAFF" && (
            <span className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
              Staff Mode (Read-Only)
            </span>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm shadow-xs transition ${
              role === "ADMIN"
                ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                : "bg-neutral-400 cursor-not-allowed opacity-60"
            }`}
          >
            <span>+</span>
            <span>Create Discount</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Discounts Table */}
      <DataTable
        columns={columns}
        data={discounts}
        isLoading={loading}
        title="Promotions & Coupons"
        description="Applied automatically or by promo code during subscription calculation"
        searchable
        searchPlaceholder="Search discount code or name..."
      />

      {/* Create / Edit Discount Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingDiscount ? "Edit Discount" : "Create Discount Campaign"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveDiscount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Campaign Name" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Summer Launch"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="Promo Code" required>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER10"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Discount Type" required>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DiscountType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </FormField>

                <FormField label="Applies To" required>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as DiscountTarget)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SUBSCRIPTION">Total Subscription</option>
                    <option value="PRODUCT">Specific Product</option>
                  </select>
                </FormField>
              </div>

              {type === "PERCENTAGE" ? (
                <FormField
                  label="Discount Percentage (%)"
                  required
                  helperText="Must not exceed 100%"
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    value={percentageValue}
                    onChange={(e) => setPercentageValue(parseFloat(e.target.value) || 0)}
                    placeholder="10"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              ) : (
                <FormField
                  label="Fixed Discount Amount"
                  required
                  helperText={`Stored in paise: ${fixedValuePaise} paise`}
                >
                  <MoneyInput
                    valuePaise={fixedValuePaise}
                    onChangePaise={(paise) => setFixedValuePaise(paise || 0)}
                    min={1}
                    placeholder="500.00"
                  />
                </FormField>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Min Spend Required" helperText={`${minPurchasePaise} paise`}>
                  <MoneyInput
                    valuePaise={minPurchasePaise}
                    onChangePaise={(paise) => setMinPurchasePaise(paise || 0)}
                    min={0}
                    placeholder="5,000.00"
                  />
                </FormField>

                <FormField label="Max Redemptions">
                  <input
                    type="number"
                    min={1}
                    value={maxUsageLimit}
                    onChange={(e) => setMaxUsageLimit(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Date" required>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="End Date" required helperText="Cannot be earlier than start date">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              </div>

              <FormField label="Description">
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 10% discount on orders over ₹5,000"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                >
                  {editingDiscount ? "Save Changes" : "Create Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
