"use client";

import React, { useState, useEffect } from "react";
import { Product, ProductVariant } from "@/lib/schemas";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { FormField } from "@/components/shared/FormField";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Software");
  const [basePricePaise, setBasePricePaise] = useState<number>(100000); // default ₹1,000
  const [formError, setFormError] = useState("");

  // Variant form states
  const [varName, setVarName] = useState("");
  const [varSku, setVarSku] = useState("");
  const [varExtraPaise, setVarExtraPaise] = useState<number>(56000); // default ₹560
  const [varError, setVarError] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/products");
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setCode("");
    setDescription("");
    setCategory("Software");
    setBasePricePaise(100000);
    setFormError("");
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    setDescription(p.description || "");
    setCategory(p.category || "Software");
    setBasePricePaise(p.basePrice);
    setFormError("");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) return setFormError("Product name is required");
    if (!code.trim()) return setFormError("Product code is required");
    if (basePricePaise < 0) return setFormError("Base price cannot be negative");

    try {
      const payload = {
        name,
        code,
        description,
        category,
        basePrice: basePricePaise,
        active: editingProduct ? editingProduct.active : true,
      };

      const url = editingProduct
        ? `/api/v1/products/${editingProduct.id}`
        : "/api/v1/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save product");
      }

      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleToggleProduct = async (p: Product) => {
    try {
      const res = await fetch(`/api/v1/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
      });
      const json = await res.json();
      if (json.success) fetchProducts();
    } catch (err: any) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  const openVariantManager = (p: Product) => {
    setSelectedProductForVariants(p);
  };

  const openAddVariantModal = () => {
    setEditingVariant(null);
    setVarName("");
    setVarSku("");
    setVarExtraPaise(56000);
    setVarError("");
    setIsVariantModalOpen(true);
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariants) return;
    setVarError("");

    if (!varName.trim()) return setVarError("Variant name is required");
    if (varExtraPaise < 0) return setVarError("Extra price cannot be negative");

    try {
      const payload = {
        name: varName,
        sku: varSku || undefined,
        extraPrice: varExtraPaise,
        active: true,
      };

      const url = editingVariant
        ? `/api/v1/products/${selectedProductForVariants.id}/variants/${editingVariant.id}`
        : `/api/v1/products/${selectedProductForVariants.id}/variants`;
      const method = editingVariant ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save variant");
      }

      setIsVariantModalOpen(false);
      // Refresh current product and list
      const updatedProduct = json.data;
      setSelectedProductForVariants(updatedProduct);
      fetchProducts();
    } catch (err: any) {
      setVarError(err.message);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedProductForVariants) return;
    if (!confirm("Are you sure you want to delete this variant?")) return;

    try {
      const res = await fetch(
        `/api/v1/products/${selectedProductForVariants.id}/variants/${variantId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Cannot delete variant");
      }

      const updatedVariants = selectedProductForVariants.variants.filter(
        (v) => v.id !== variantId
      );
      setSelectedProductForVariants({
        ...selectedProductForVariants,
        variants: updatedVariants,
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
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
      key: "category",
      header: "Category",
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          {row.category || "General"}
        </span>
      ),
    },
    {
      key: "basePrice",
      header: "Base Price",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
          ₹{(row.basePrice / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "variants",
      header: "Variants",
      render: (row) => (
        <button
          type="button"
          onClick={() => openVariantManager(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <span>{row.variants?.length || 0} variant(s)</span>
          <span className="text-blue-600 dark:text-blue-400 font-bold">Manage</span>
        </button>
      ),
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleProduct(row)}
          title="Click to toggle status"
          className="cursor-pointer"
        >
          <StatusChip status={row.active ? "Active" : "Inactive"} />
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Product Catalog
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Register products, base selling prices in integer paise, and customize variants.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-xs transition"
        >
          <span>+</span>
          <span>Add Product</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Products Table */}
      <DataTable
        columns={columns}
        data={products}
        isLoading={loading}
        title="Products"
        description="All business products available for subscription templates"
        searchable
        searchPlaceholder="Search product name or code..."
      />

      {/* Create / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingProduct ? "Edit Product" : "Create New Product"}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
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

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <FormField label="Product Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Business Software"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Product Code / SKU" required>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. BIZ-SOFT-01"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Software">Software</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Services">Services</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </FormField>
              </div>

              <FormField
                label="Base Selling Price"
                required
                helperText={`Stored internally as integer paise: ${basePricePaise} paise`}
              >
                <MoneyInput
                  valuePaise={basePricePaise}
                  onChangePaise={(paise) => setBasePricePaise(paise || 0)}
                  min={0}
                  placeholder="1,000.00"
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details about this product..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                >
                  {editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Manager Drawer / Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Variants for: {selectedProductForVariants.name}
                </h3>
                <p className="text-xs text-neutral-500">
                  Base Price: ₹{(selectedProductForVariants.basePrice / 100).toLocaleString()} (
                  {selectedProductForVariants.basePrice} paise)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForVariants(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">
                Active Variants ({selectedProductForVariants.variants?.length || 0})
              </span>
              <button
                type="button"
                onClick={openAddVariantModal}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                + Add Variant
              </button>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              {(!selectedProductForVariants.variants ||
                selectedProductForVariants.variants.length === 0) ? (
                <div className="p-6 text-center text-xs text-neutral-400">
                  No variants added yet. Click &quot;Add Variant&quot; above (e.g. Odoo variant for +₹560).
                </div>
              ) : (
                selectedProductForVariants.variants.map((v) => {
                  const totalPricePaise = selectedProductForVariants.basePrice + v.extraPrice;
                  return (
                    <div
                      key={v.id}
                      className="p-3.5 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <div>
                        <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <span>{v.name}</span>
                          {v.sku && (
                            <span className="text-xs font-mono text-neutral-400">
                              [{v.sku}]
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Extra: +₹{(v.extraPrice / 100).toLocaleString()} ({v.extraPrice} paise) →{" "}
                          <strong className="text-neutral-800 dark:text-neutral-200">
                            Total: ₹{(totalPricePaise / 100).toLocaleString()} ({totalPricePaise} paise)
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVariant(v);
                            setVarName(v.name);
                            setVarSku(v.sku || "");
                            setVarExtraPaise(v.extraPrice);
                            setIsVariantModalOpen(true);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id!)}
                          className="px-2 py-1 text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedProductForVariants(null)}
                className="px-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Variant Modal */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-2">
              {editingVariant ? "Edit Variant" : "Add Product Variant"}
            </h4>

            {varError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                {varError}
              </div>
            )}

            <form onSubmit={handleSaveVariant} className="space-y-4">
              <FormField label="Variant Name" required>
                <input
                  type="text"
                  value={varName}
                  onChange={(e) => setVarName(e.target.value)}
                  placeholder="e.g. Odoo"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <FormField label="Variant SKU">
                <input
                  type="text"
                  value={varSku}
                  onChange={(e) => setVarSku(e.target.value)}
                  placeholder="e.g. BIZ-SOFT-ODOO"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <FormField
                label="Extra Price Added to Base"
                required
                helperText={`Stored in integer paise: ${varExtraPaise} paise (+₹${(varExtraPaise / 100).toFixed(2)})`}
              >
                <MoneyInput
                  valuePaise={varExtraPaise}
                  onChangePaise={(paise) => setVarExtraPaise(paise || 0)}
                  min={0}
                  placeholder="560.00"
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
