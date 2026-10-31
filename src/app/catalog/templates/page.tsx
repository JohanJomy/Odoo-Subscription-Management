"use client";

import React, { useState, useEffect } from "react";
import { QuotationTemplate, Product, Plan } from "@/lib/schemas";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { FormField } from "@/components/shared/FormField";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplate | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [planId, setPlanId] = useState("");
  const [lines, setLines] = useState<
    { productId: string; variantId: string | null; quantity: number }[]
  >([]);
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, pRes, plRes] = await Promise.all([
        fetch("/api/v1/templates"),
        fetch("/api/v1/products"),
        fetch("/api/v1/plans"),
      ]);

      const [tJson, pJson, plJson] = await Promise.all([
        tRes.json(),
        pRes.json(),
        plRes.json(),
      ]);

      if (tJson.success) setTemplates(tJson.data);
      if (pJson.success) setProducts(pJson.data);
      if (plJson.success) {
        setPlans(plJson.data);
        if (!planId && plJson.data.length > 0) setPlanId(plJson.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load quotation templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setPlanId(plans[0]?.id || "");
    // Default initial line with first product
    if (products.length > 0) {
      const firstProd = products[0];
      setLines([
        {
          productId: firstProd.id!,
          variantId: firstProd.variants?.[0]?.id || null,
          quantity: 1,
        },
      ]);
    } else {
      setLines([]);
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: QuotationTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setDescription(t.description || "");
    setPlanId(t.planId);
    setLines(
      t.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId || null,
        quantity: l.quantity,
      }))
    );
    setFormError("");
    setIsModalOpen(true);
  };

  const handleAddLine = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setLines([
      ...lines,
      {
        productId: firstProd.id!,
        variantId: firstProd.variants?.[0]?.id || null,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...lines];
    updated[idx] = {
      ...updated[idx],
      productId: newProductId,
      variantId: prod?.variants?.[0]?.id || null,
    };
    setLines(updated);
  };

  const handleVariantChange = (idx: number, newVariantId: string) => {
    const updated = [...lines];
    updated[idx].variantId = newVariantId || null;
    setLines(updated);
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    const updated = [...lines];
    updated[idx].quantity = Math.max(1, qty);
    setLines(updated);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) return setFormError("Template name is required");
    if (!planId) return setFormError("Default plan is required");
    if (lines.length === 0) return setFormError("At least one product line is required in a template");

    try {
      const payload = {
        name,
        description: description || undefined,
        planId,
        lines,
        active: editingTemplate ? editingTemplate.active : true,
      };

      const url = editingTemplate
        ? `/api/v1/templates/${editingTemplate.id}`
        : "/api/v1/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save template");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/v1/templates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete template");
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: Column<QuotationTemplate>[] = [
    {
      key: "name",
      header: "Template Details",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
            {row.name}
          </div>
          <div className="text-xs text-neutral-500">
            {row.description || "Reusable quotation preset"}
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Default Plan",
      render: (row) => (
        <span className="font-medium text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
          {row.planName || "Standard Plan"}
        </span>
      ),
    },
    {
      key: "lines",
      header: "Included Products & Variants",
      render: (row) => (
        <div className="space-y-1">
          {row.lines.map((l, i) => (
            <div key={i} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {l.quantity}x
              </span>
              <span>{l.productName}</span>
              {l.variantName && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  (+{l.variantName})
                </span>
              )}
            </div>
          ))}
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
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDeleteTemplate(row.id!)}
            className="text-xs text-red-500 hover:underline font-medium"
          >
            Delete
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
            Quotation Templates
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Build and manage reusable product packages to streamline subscription creation.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-xs transition"
        >
          <span>+</span>
          <span>Create Template</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Templates Table */}
      <DataTable
        columns={columns}
        data={templates}
        isLoading={loading}
        title="Quotation Templates"
        description="Selectable bundles that pre-fill line items during subscription checkout"
        searchable
        searchPlaceholder="Search templates..."
      />

      {/* Create / Edit Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingTemplate ? "Edit Quotation Template" : "Create Quotation Template"}
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

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Template Name" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Business Template"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="Default Plan" required>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} (₹{(pl.price / 100).toLocaleString()}/{pl.billingPeriod.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Description">
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Pre-packaged bundle for growing businesses"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              {/* Product Lines Selector */}
              <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Product Lines in Template
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {lines.map((line, idx) => {
                    const currentProduct = products.find((p) => p.id === line.productId);
                    const variants = currentProduct?.variants || [];

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                      >
                        <div className="sm:col-span-5">
                          <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                            Product
                          </label>
                          <select
                            value={line.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (₹{(p.basePrice / 100).toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                            Variant (Optional)
                          </label>
                          <select
                            value={line.variantId || ""}
                            onChange={(e) => handleVariantChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          >
                            <option value="">No Variant (Base Only)</option>
                            {variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} (+₹{(v.extraPrice / 100).toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              handleQuantityChange(idx, parseInt(e.target.value) || 1)
                            }
                            className="w-full px-2 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-neutral-400 hover:text-red-500 text-sm mt-3"
                            title="Remove Line"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
