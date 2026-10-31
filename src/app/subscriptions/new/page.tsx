"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Product,
  Plan,
  Tax,
  Discount,
  QuotationTemplate,
  SubscriptionPriceResponse,
} from "@/lib/schemas";
import { FormField } from "@/components/shared/FormField";

interface LineFormState {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export default function NewSubscriptionPage() {
  const router = useRouter();

  // Data Sources
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState("Acme Enterprise");
  const [customerEmail, setCustomerEmail] = useState("procurement@acme.com");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [selectedTaxId, setSelectedTaxId] = useState<string>("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Line items state
  const [lines, setLines] = useState<LineFormState[]>([]);

  // Server Calculated Price Response
  const [priceData, setPriceData] = useState<SubscriptionPriceResponse | null>(null);

  // Load all foundational data
  useEffect(() => {
    async function loadAll() {
      try {
        setLoadingData(true);
        const [prodRes, planRes, taxRes, discRes, tmplRes] = await Promise.all([
          fetch("/api/v1/products"),
          fetch("/api/v1/plans"),
          fetch("/api/v1/taxes"),
          fetch("/api/v1/discounts"),
          fetch("/api/v1/templates"),
        ]);

        const [prodJson, planJson, taxJson, discJson, tmplJson] = await Promise.all([
          prodRes.json(),
          planRes.json(),
          taxRes.json(),
          discRes.json(),
          tmplRes.json(),
        ]);

        if (prodJson.success) setProducts(prodJson.data);
        if (planJson.success) {
          setPlans(planJson.data);
          if (planJson.data.length > 0) setSelectedPlanId(planJson.data[0].id);
        }
        if (taxJson.success) {
          setTaxes(taxJson.data);
          const defaultTax = taxJson.data.find((t: Tax) => t.isDefault);
          if (defaultTax) setSelectedTaxId(defaultTax.id);
        }
        if (discJson.success) setDiscounts(discJson.data);
        if (tmplJson.success) setTemplates(tmplJson.data);

        // Preload template if available (e.g. Standard Business Template)
        if (tmplJson.success && tmplJson.data.length > 0) {
          const firstTemplate: QuotationTemplate = tmplJson.data[0];
          setSelectedTemplateId(firstTemplate.id!);
          if (firstTemplate.planId) setSelectedPlanId(firstTemplate.planId);
          setLines(
            firstTemplate.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId || null,
              quantity: l.quantity,
            }))
          );
        }
      } catch (err: any) {
        setError(err.message || "Failed to load catalog options");
      } finally {
        setLoadingData(false);
      }
    }

    loadAll();
  }, []);

  // Handler when quotation template is chosen: Auto-load template's products!
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      if (tmpl.planId) setSelectedPlanId(tmpl.planId);
      setLines(
        tmpl.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: l.quantity,
        }))
      );
    }
  };

  // Line item manipulation
  const handleAddLine = () => {
    if (products.length === 0) return;
    const firstProduct = products[0];
    setLines([
      ...lines,
      {
        productId: firstProduct.id!,
        variantId: firstProduct.variants?.[0]?.id || null,
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

  // SERVER-SIDE PRICE CALCULATION (CRITICAL RULE: NEVER COMPUTE IN BROWSER)
  const calculatePrice = useCallback(async () => {
    if (!selectedPlanId || lines.length === 0) {
      setPriceData(null);
      return;
    }

    try {
      setCalculatingPrice(true);
      const res = await fetch("/api/v1/subscriptions/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          lines,
          discountId: selectedDiscountId || null,
          taxId: selectedTaxId || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPriceData(json.data);
      } else {
        setPriceData(null);
      }
    } catch (err: any) {
      console.error("Price calculation error:", err);
    } finally {
      setCalculatingPrice(false);
    }
  }, [selectedPlanId, lines, selectedDiscountId, selectedTaxId]);

  // Trigger price calculation whenever plan, lines, discount, or tax change
  useEffect(() => {
    if (!loadingData) {
      calculatePrice();
    }
  }, [loadingData, calculatePrice]);

  // Handle final subscription creation
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) return setError("Customer name is required");
    if (!customerEmail.trim()) return setError("Customer email is required");
    if (!selectedPlanId) return setError("Please select a subscription plan");
    if (lines.length === 0)
      return setError("Subscription must have at least one product line");

    try {
      setSubmitLoading(true);
      const payload = {
        customerId: `cust-${Date.now().toString(36)}`,
        customerName,
        customerEmail,
        planId: selectedPlanId,
        templateId: selectedTemplateId || null,
        discountId: selectedDiscountId || null,
        taxId: selectedTaxId || null,
        startDate: new Date(startDate).toISOString(),
        lines,
        notes: notes || undefined,
      };

      const res = await fetch("/api/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create subscription");
      }

      alert("Subscription created successfully!");
      router.push("/subscriptions");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="py-20 text-center text-sm text-neutral-500 animate-pulse">
        Loading catalog options, plans, and templates...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Create Customer Subscription
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Choose customer, plan, and quotation template. Totals calculated strictly on the server in integer paise.
          </p>
        </div>
        <Link
          href="/subscriptions"
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          ← Back to Subscriptions
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateSubscription} className="space-y-8">
        {/* Step 1 & 2: Customer & Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Customer Information</span>
            </h3>

            <FormField label="Customer / Account Name" required>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Enterprise"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Customer Email" required>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. billing@acme.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Start Date" required>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              <span>Plan & Quotation Template</span>
            </h3>

            <FormField label="Quotation Template (Auto-fills Products)">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Custom Selection (No Template)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.lines.length} lines)
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Subscription Plan" required>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} — ₹{(pl.price / 100).toLocaleString()}/{pl.billingPeriod.toLowerCase()} ({pl.price} paise)
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax Rate">
                <select
                  value={selectedTaxId}
                  onChange={(e) => setSelectedTaxId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Tax</option>
                  {taxes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rate}%)
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Discount Campaign">
                <select
                  value={selectedDiscountId}
                  onChange={(e) => setSelectedDiscountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Discount</option>
                  {discounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.type === "PERCENTAGE" ? `${d.value}%` : `₹${d.value / 100}`}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>
        </div>

        {/* Step 3: Product Lines & Variants */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              <span>Product Lines & Variants</span>
            </h3>
            <button
              type="button"
              onClick={handleAddLine}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 transition"
            >
              + Add Product Line
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="py-8 text-center text-neutral-400 text-sm">
              No products selected. Click &quot;+ Add Product Line&quot; or choose a template above.
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const currentProduct = products.find((p) => p.id === line.productId);
                const variants = currentProduct?.variants || [];
                const currentVariant = variants.find((v) => v.id === line.variantId);

                const basePricePaise = currentProduct?.basePrice || 0;
                const extraPricePaise = currentVariant?.extraPrice || 0;
                const unitPricePaise = basePricePaise + extraPricePaise;
                const lineTotalPaise = unitPricePaise * line.quantity;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                  >
                    {/* Product */}
                    <div className="md:col-span-4">
                      <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                        Product
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Base ₹{(p.basePrice / 100).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Variant */}
                    <div className="md:col-span-4">
                      <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                        Variant (e.g. Odoo +₹560)
                      </label>
                      <select
                        value={line.variantId || ""}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">No Variant (Base Only)</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (+₹{(v.extraPrice / 100).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          handleQuantityChange(idx, parseInt(e.target.value) || 1)
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                      />
                    </div>

                    {/* Line Total in Paise */}
                    <div className="md:col-span-2 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-neutral-400">Total</div>
                        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
                          ₹{(lineTotalPaise / 100).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {lineTotalPaise} p
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-neutral-400 hover:text-red-500 p-1 rounded"
                        title="Delete line"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 4: Server-Side Price Summary Box */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                4
              </span>
              <span>Server-Calculated Totals (POST /api/v1/subscriptions/price)</span>
            </h3>

            {calculatingPrice && (
              <span className="text-xs text-blue-600 animate-pulse font-medium">
                Syncing with server...
              </span>
            )}
          </div>

          {priceData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detailed Breakdown */}
              <div className="space-y-2 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-neutral-50/40 dark:bg-neutral-800/20">
                <div className="font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                  Line Calculation Verification
                </div>
                {priceData.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
                    <div>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {item.quantity}x {item.productName}
                      </span>
                      {item.variantName && (
                        <span className="text-neutral-400 ml-1">
                          (+{item.variantName}: ₹{item.variantExtra / 100})
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-neutral-800 dark:text-neutral-200">
                      ₹{(item.lineTotal / 100).toLocaleString()} ({item.lineTotal} paise)
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex justify-between font-medium">
                  <span>Product Lines Subtotal:</span>
                  <span className="font-mono font-bold">
                    ₹{(priceData.linesSubtotal / 100).toLocaleString()} ({priceData.linesSubtotal} paise)
                  </span>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="space-y-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Plan Price:</span>
                  <span>₹{(priceData.planPrice / 100).toLocaleString()} ({priceData.planPrice} paise)</span>
                </div>

                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Lines Subtotal:</span>
                  <span>₹{(priceData.linesSubtotal / 100).toLocaleString()} ({priceData.linesSubtotal} paise)</span>
                </div>

                <div className="flex justify-between font-semibold text-neutral-800 dark:text-neutral-200 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Gross Amount:</span>
                  <span>₹{(priceData.grossAmount / 100).toLocaleString()} ({priceData.grossAmount} paise)</span>
                </div>

                {priceData.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({priceData.discountDescription}):</span>
                    <span>-₹{(priceData.discountAmount / 100).toLocaleString()} ({priceData.discountAmount} paise)</span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Tax ({priceData.taxName || "None"}):</span>
                  <span>+₹{(priceData.taxAmount / 100).toLocaleString()} ({priceData.taxAmount} paise)</span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t-2 border-neutral-300 dark:border-neutral-700 text-sm">
                  <span className="font-sans font-bold text-neutral-900 dark:text-white">
                    Final Total:
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{(priceData.totalAmount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {priceData.totalAmount} integer paise
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400">
              Select a plan and at least one product line to calculate server price.
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/subscriptions"
            className="px-5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitLoading || lines.length === 0}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-xs transition"
          >
            {submitLoading ? "Creating Subscription..." : "Create Subscription"}
          </button>
        </div>
      </form>
    </div>
  );
}
