/**
 * LoopLedger - Billing & Pricing Engine
 * Owner: P2 (Billing Engine Lead)
 * 
 * All monetary calculations are integers in paise (1 INR = 100 paise).
 * Precision: Math.round per line, never on the total.
 */

export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type PaymentTerm = 'IMMEDIATE' | 'NET15' | 'NET30';
export type DiscountType = 'FIXED' | 'PERCENT';
export type DiscountScope = 'PRODUCT' | 'SUBSCRIPTION';

export interface PricingPlan {
  id: string;
  name: string;
  price: number; // paise
  billingPeriod: BillingPeriod;
}

export interface PricingLineInput {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantAttribute?: string | null;
  variantValue?: string | null;
  variantExtraPrice?: number; // paise (e.g. 56000 for ₹560 Odoo variant)
  salesPrice: number; // paise
  qty: number;
  taxId?: string | null;
  taxRatePercent?: number; // e.g. 18.0 for 18%
}

export interface DiscountCandidate {
  id: string;
  name: string;
  type: DiscountType;
  fixedAmount?: number | null; // paise
  percent?: number | null; // 1-100
  minPurchase?: number; // paise
  minQty?: number;
  startDate: Date;
  endDate: Date;
  usageLimit: number;
  usedCount: number;
  appliesTo: DiscountScope;
  productId?: string | null;
  subscriptionId?: string | null;
  active: boolean;
}

export interface ComputedInvoiceLine {
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number; // paise
  lineAmount: number; // qty * unitPrice
  discountAmount: number; // paise
  taxableAmount: number; // lineAmount - discountAmount
  taxRatePercent: number;
  taxAmount: number; // paise
  totalAmount: number; // taxableAmount + taxAmount
}

export interface PricingResult {
  lines: ComputedInvoiceLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number; // subtotal - discountTotal + taxTotal
  dueDate: Date;
  appliedDiscount?: {
    id: string;
    name: string;
    saving: number;
  } | null;
}

/**
 * Advance a date by a billing period
 */
export function addPeriod(date: Date, period: BillingPeriod): Date {
  const result = new Date(date.getTime());
  switch (period) {
    case 'DAILY':
      result.setDate(result.getDate() + 1);
      break;
    case 'WEEKLY':
      result.setDate(result.getDate() + 7);
      break;
    case 'MONTHLY': {
      const targetMonth = result.getMonth() + 1;
      result.setMonth(targetMonth);
      break;
    }
    case 'YEARLY':
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  return result;
}

/**
 * Calculate due date based on payment term
 */
export function calculateDueDate(invoiceDate: Date, paymentTerm: PaymentTerm): Date {
  const due = new Date(invoiceDate.getTime());
  const daysToAdd = paymentTerm === 'NET30' ? 30 : paymentTerm === 'NET15' ? 15 : 0;
  due.setDate(due.getDate() + daysToAdd);
  return due;
}

/**
 * Line tax computation: round((lineAmount - lineDiscount) * ratePercent / 100)
 */
export function calcTax(taxableAmount: number, ratePercent: number): number {
  if (taxableAmount <= 0 || ratePercent <= 0) return 0;
  return Math.round((taxableAmount * ratePercent) / 100);
}

/**
 * Distribute a discount proportionally across lines with remainder assigned to the last line
 */
export function allocateDiscount(totalDiscount: number, lineAmounts: number[]): number[] {
  if (totalDiscount <= 0 || lineAmounts.length === 0) {
    return lineAmounts.map(() => 0);
  }

  const baseSum = lineAmounts.reduce((acc, curr) => acc + curr, 0);
  if (baseSum <= 0) {
    return lineAmounts.map(() => 0);
  }

  const cappedDiscount = Math.min(totalDiscount, baseSum);
  const allocations: number[] = [];
  let allocatedSum = 0;

  for (let i = 0; i < lineAmounts.length; i++) {
    if (i === lineAmounts.length - 1) {
      // Last line receives the remainder to avoid rounding drift
      allocations.push(cappedDiscount - allocatedSum);
    } else {
      const share = Math.round((cappedDiscount * lineAmounts[i]) / baseSum);
      allocations.push(share);
      allocatedSum += share;
    }
  }

  return allocations;
}

/**
 * Pick the best eligible discount that produces the highest monetary saving
 */
export function pickBestDiscount(
  discounts: DiscountCandidate[],
  lines: { productId?: string; lineAmount: number; qty: number }[],
  subscriptionId: string,
  today: Date
): { discount: DiscountCandidate; saving: number; matchingIndices: number[] } | null {
  let bestMatch: { discount: DiscountCandidate; saving: number; matchingIndices: number[] } | null = null;

  const totalOrderAmount = lines.reduce((sum, l) => sum + l.lineAmount, 0);
  // minQty checks must only count PRODUCT lines (those with a productId).
  // The plan fee line (qty=1, no productId) must never inflate the seat count.
  const productLinesQty = lines
    .filter((l) => !!l.productId)
    .reduce((sum, l) => sum + l.qty, 0);

  for (const disc of discounts) {
    if (!disc.active) continue;
    if (disc.usedCount >= disc.usageLimit) continue;
    if (today < disc.startDate || today > disc.endDate) continue;

    let matchingIndices: number[] = [];
    let applicableBase = 0;
    let applicableQty = 0;

    if (disc.appliesTo === 'PRODUCT') {
      if (!disc.productId) continue;
      lines.forEach((l, idx) => {
        if (l.productId === disc.productId) {
          matchingIndices.push(idx);
          applicableBase += l.lineAmount;
          applicableQty += l.qty;
        }
      });
    } else if (disc.appliesTo === 'SUBSCRIPTION') {
      // Matches subscription or general subscription-level discount
      if (!disc.subscriptionId || disc.subscriptionId === subscriptionId) {
        matchingIndices = lines.map((_, idx) => idx);
        applicableBase = totalOrderAmount;
        // Use only product line qty — plan fee (qty=1) must not count as a seat
        applicableQty = productLinesQty;
      }
    }

    if (matchingIndices.length === 0) continue;

    // Check minimum spend & minimum quantity thresholds
    const minPurchase = disc.minPurchase ?? 0;
    const minQty = disc.minQty ?? 0;
    if (applicableBase < minPurchase || applicableQty < minQty) continue;

    // Calculate saving
    let saving = 0;
    if (disc.type === 'PERCENT') {
      const pct = disc.percent ?? 0;
      saving = Math.round((applicableBase * pct) / 100);
    } else if (disc.type === 'FIXED') {
      const fixed = disc.fixedAmount ?? 0;
      saving = Math.min(fixed, applicableBase);
    }

    if (saving > 0 && (!bestMatch || saving > bestMatch.saving)) {
      bestMatch = { discount: disc, saving, matchingIndices };
    }
  }

  return bestMatch;
}

/**
 * Single pricing formula for subscriptions and invoices
 * Formula:
 *  - 1 Plan Fee line (plan.price, qty 1, taxed with defaultTaxRate)
 *  - 1 Line per product item (qty * (salesPrice + variantExtra))
 *  - Best eligible discount applied
 *  - Line taxes computed after discount
 */
export function priceSubscription(params: {
  plan: PricingPlan;
  lines: PricingLineInput[];
  discounts?: DiscountCandidate[];
  defaultTaxRatePercent?: number; // e.g. 18 for GST 18% on plan fee
  subscriptionId?: string;
  invoiceDate?: Date;
  paymentTerm?: PaymentTerm;
}): PricingResult {
  const invoiceDate = params.invoiceDate || new Date();
  const paymentTerm = params.paymentTerm || 'NET15';
  const defaultTaxRate = params.defaultTaxRatePercent ?? 18;

  // 1. Build initial raw lines
  interface RawLine {
    productId?: string;
    description: string;
    qty: number;
    unitPrice: number;
    lineAmount: number;
    taxRatePercent: number;
  }

  const rawLines: RawLine[] = [];

  // Line 1: Plan Fee
  rawLines.push({
    description: `${params.plan.name} Plan Fee`,
    qty: 1,
    unitPrice: params.plan.price,
    lineAmount: params.plan.price,
    taxRatePercent: defaultTaxRate,
  });

  // Subsequent Lines: Products
  for (const item of params.lines) {
    const variantExtra = item.variantExtraPrice ?? 0;
    const unitPrice = item.salesPrice + variantExtra;
    const lineAmount = item.qty * unitPrice;

    let description = item.productName;
    if (item.variantAttribute && item.variantValue) {
      description = `${item.productName} (${item.variantAttribute}: ${item.variantValue})`;
    }

    rawLines.push({
      productId: item.productId,
      description,
      qty: item.qty,
      unitPrice,
      lineAmount,
      taxRatePercent: item.taxRatePercent ?? 0,
    });
  }

  // 2. Pick best discount
  const bestDiscount = params.discounts && params.discounts.length > 0
    ? pickBestDiscount(
        params.discounts,
        rawLines.map((l) => ({ productId: l.productId, lineAmount: l.lineAmount, qty: l.qty })),
        params.subscriptionId || '',
        invoiceDate
      )
    : null;

  // 3. Allocate discount across matching lines
  const lineDiscounts = new Array(rawLines.length).fill(0);
  if (bestDiscount) {
    const matchingLineAmounts = bestDiscount.matchingIndices.map((idx) => rawLines[idx].lineAmount);
    const allocated = allocateDiscount(bestDiscount.saving, matchingLineAmounts);
    bestDiscount.matchingIndices.forEach((lineIdx, i) => {
      lineDiscounts[lineIdx] = allocated[i];
    });
  }

  // 4. Calculate taxes and line totals
  const computedLines: ComputedInvoiceLine[] = rawLines.map((raw, idx) => {
    const discountAmount = lineDiscounts[idx];
    const taxableAmount = Math.max(0, raw.lineAmount - discountAmount);
    const taxAmount = calcTax(taxableAmount, raw.taxRatePercent);
    const totalAmount = taxableAmount + taxAmount;

    return {
      productId: raw.productId,
      description: raw.description,
      qty: raw.qty,
      unitPrice: raw.unitPrice,
      lineAmount: raw.lineAmount,
      discountAmount,
      taxableAmount,
      taxRatePercent: raw.taxRatePercent,
      taxAmount,
      totalAmount,
    };
  });

  const subtotal = computedLines.reduce((acc, l) => acc + l.lineAmount, 0);
  const discountTotal = computedLines.reduce((acc, l) => acc + l.discountAmount, 0);
  const taxTotal = computedLines.reduce((acc, l) => acc + l.taxAmount, 0);
  const total = subtotal - discountTotal + taxTotal;
  const dueDate = calculateDueDate(invoiceDate, paymentTerm);

  return {
    lines: computedLines,
    subtotal,
    discountTotal,
    taxTotal,
    total,
    dueDate,
    appliedDiscount: bestDiscount
      ? {
          id: bestDiscount.discount.id,
          name: bestDiscount.discount.name,
          saving: bestDiscount.saving,
        }
      : null,
  };
}

