"use client";

import React, { useState, useEffect } from "react";
import { Tax, UserRole } from "@/lib/schemas";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { FormField } from "@/components/shared/FormField";

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role
  const [role, setRole] = useState<UserRole>("ADMIN");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState<number>(18);
  const [isDefault, setIsDefault] = useState(false);
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

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/taxes");
      const json = await res.json();
      if (json.success) {
        setTaxes(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const openCreateModal = () => {
    if (role !== "ADMIN") {
      alert("Staff permission restriction: Staff cannot create or modify taxes. Switch role to Admin in the top-right to proceed.");
      return;
    }
    setEditingTax(null);
    setName("");
    setCode("");
    setDescription("");
    setRate(18);
    setIsDefault(false);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: Tax) => {
    if (role !== "ADMIN") {
      alert("Staff permission restriction: Staff cannot create or modify taxes. Switch role to Admin in the top-right to proceed.");
      return;
    }
    setEditingTax(t);
    setName(t.name);
    setCode(t.code || "");
    setDescription(t.description || "");
    setRate(t.rate);
    setIsDefault(t.isDefault);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) return setFormError("Tax name is required");
    if (rate < 0 || rate > 100) return setFormError("Tax rate must be between 0% and 100%");

    try {
      const payload = {
        name,
        code: code || undefined,
        description: description || undefined,
        rate,
        isDefault,
        active: editingTax ? editingTax.active : true,
      };

      const url = editingTax ? `/api/v1/taxes/${editingTax.id}` : "/api/v1/taxes";
      const method = editingTax ? "PUT" : "POST";

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
        throw new Error(json.error || "Failed to save tax");
      }

      setIsModalOpen(false);
      fetchTaxes();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const columns: Column<Tax>[] = [
    {
      key: "name",
      header: "Tax Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>{row.name}</span>
              {row.isDefault && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Default
                </span>
              )}
            </div>
            {row.code && <div className="text-xs text-neutral-500 font-mono">{row.code}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "rate",
      header: "Tax Rate (%)",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
          {row.rate}%
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {row.description || "—"}
        </span>
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
            Tax Configuration
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure jurisdiction taxes (e.g. GST 18%, Reduced tax 5%). Staff can view; Admin can modify.
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
            <span>Create Tax</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Taxes Table */}
      <DataTable
        columns={columns}
        data={taxes}
        isLoading={loading}
        title="Taxes & Rates"
        description="Applied to taxable subscription amounts after discounts"
        searchable
        searchPlaceholder="Search tax name..."
      />

      {/* Create / Edit Tax Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingTax ? "Edit Tax" : "Create Tax Rate"}
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

            <form onSubmit={handleSaveTax} className="space-y-4">
              <FormField label="Tax Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. GST or Reduced tax"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tax Code">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. GST-18"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="Rate (%)" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                    placeholder="18"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              </div>

              <FormField label="Description">
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard 18% Goods & Services Tax"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  Set as default tax for new subscriptions
                </span>
              </label>

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
                  {editingTax ? "Save Changes" : "Create Tax"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
