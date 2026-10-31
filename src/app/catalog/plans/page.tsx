"use client";

import React, { useState, useEffect } from "react";
import { Plan, BillingPeriod } from "@/lib/schemas";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { FormField } from "@/components/shared/FormField";

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [pricePaise, setPricePaise] = useState<number>(200000); // ₹2,000 default
  const [minQuantity, setMinQuantity] = useState<number>(1);

  // The 4 Critical Switches
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);
  const [autoClose, setAutoClose] = useState(false);

  const [formError, setFormError] = useState("");

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/plans");
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName("");
    setCode("");
    setDescription("");
    setBillingPeriod("MONTHLY");
    setPricePaise(200000);
    setMinQuantity(1);
    setClosable(true);
    setPausable(true);
    setRenewable(true);
    setAutoClose(false);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setName(p.name);
    setCode(p.code);
    setDescription(p.description || "");
    setBillingPeriod(p.billingPeriod);
    setPricePaise(p.price);
    setMinQuantity(p.minQuantity);
    setClosable(p.closable);
    setPausable(p.pausable);
    setRenewable(p.renewable);
    setAutoClose(p.autoClose);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) return setFormError("Plan name is required");
    if (!code.trim()) return setFormError("Plan code is required");
    if (pricePaise < 0) return setFormError("Price cannot be negative");
    if (minQuantity < 1) return setFormError("Min quantity must be at least 1");

    try {
      const payload = {
        name,
        code,
        description,
        billingPeriod,
        price: pricePaise,
        minQuantity,
        closable,
        pausable,
        renewable,
        autoClose,
        active: editingPlan ? editingPlan.active : true,
      };

      const url = editingPlan ? `/api/v1/plans/${editingPlan.id}` : "/api/v1/plans";
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save plan");
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handlePlanAction = async (plan: Plan, action: "close" | "pause" | "renew" | "activate" | "deactivate") => {
    try {
      const res = await fetch(`/api/v1/plans/${plan.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Action "${action}" not permitted on this plan.`);
      }
      alert(`Action "${action}" verified successfully for "${plan.name}"!`);
      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: Column<Plan>[] = [
    {
      key: "name",
      header: "Plan Details",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
            {row.name}
          </div>
          <div className="text-xs text-neutral-500 font-mono">{row.code}</div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price / Cycle",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
            ₹{(row.price / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
            per {row.billingPeriod.toLowerCase()}
          </div>
        </div>
      ),
    },
    {
      key: "switches",
      header: "Plan Permissions (4 Switches)",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span
            className={`px-2 py-0.5 rounded font-medium border ${
              row.closable
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 line-through"
            }`}
          >
            Closable
          </span>
          <span
            className={`px-2 py-0.5 rounded font-medium border ${
              row.pausable
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 line-through"
            }`}
          >
            Pausable
          </span>
          <span
            className={`px-2 py-0.5 rounded font-medium border ${
              row.renewable
                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 line-through"
            }`}
          >
            Renewable
          </span>
          <span
            className={`px-2 py-0.5 rounded font-medium border ${
              row.autoClose
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700"
            }`}
          >
            {row.autoClose ? "Auto-Close: Yes" : "Auto-Close: No"}
          </span>
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
      header: "Plan Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Edit
          </button>

          {/* Test Action Buttons */}
          <button
            type="button"
            title="Test Pause permission"
            onClick={() => handlePlanAction(row, "pause")}
            className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300"
          >
            Pause
          </button>
          <button
            type="button"
            title="Test Close permission"
            onClick={() => handlePlanAction(row, "close")}
            className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300"
          >
            Close
          </button>
          <button
            type="button"
            title="Test Renew permission"
            onClick={() => handlePlanAction(row, "renew")}
            className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300"
          >
            Renew
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Subscription Plans
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure recurring charging models, billing periods, and lifecycle action permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-xs transition"
        >
          <span>+</span>
          <span>Create Plan</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Plans Table */}
      <DataTable
        columns={columns}
        data={plans}
        isLoading={loading}
        title="Plans & Pricing"
        description="Active billing plans used during quotation & subscription creation"
        searchable
        searchPlaceholder="Search plan name or code..."
      />

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingPlan ? "Edit Plan" : "Create Subscription Plan"}
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

            <form onSubmit={handleSavePlan} className="space-y-4">
              <FormField label="Plan Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Business Plan"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Plan Code" required>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. PLAN-BIZ-M"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="Billing Period" required>
                  <select
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="BIANNUAL">Bi-Annual</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Recurring Price"
                  required
                  helperText={`${pricePaise} paise`}
                >
                  <MoneyInput
                    valuePaise={pricePaise}
                    onChangePaise={(paise) => setPricePaise(paise || 0)}
                    min={0}
                    placeholder="2,000.00"
                  />
                </FormField>

                <FormField label="Minimum Quantity" required>
                  <input
                    type="number"
                    min={1}
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              </div>

              {/* The Four Important Switches */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Plan Permissions & Switches
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={closable}
                      onChange={(e) => setClosable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      Closable
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pausable}
                      onChange={(e) => setPausable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      Pausable
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={renewable}
                      onChange={(e) => setRenewable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      Renewable
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoClose}
                      onChange={(e) => setAutoClose(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      Auto-close
                    </span>
                  </label>
                </div>
              </div>

              <FormField label="Description">
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional plan details..."
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
                  {editingPlan ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
