import {
  Subscription,
  SubscriptionCreate,
  SubscriptionCreateSchema,
  SubscriptionPriceRequest,
  SubscriptionPriceRequestSchema,
  SubscriptionPriceResponse,
  SubscriptionStatus,
} from "@/lib/schemas";
import { store } from "./storage";
import { getProductById } from "./products";
import { getPlanById } from "./plans";
import { getTaxById } from "./taxes";
import { getDiscountById, evaluateDiscountAmount } from "./discounts";

/**
 * Server-Side Price Calculation (CRITICAL RULE: DO NOT CALCULATE IN BROWSER)
 * All math strictly computed in integer paise.
 */
export function calculateSubscriptionPrice(
  input: SubscriptionPriceRequest
): SubscriptionPriceResponse {
  const validated = SubscriptionPriceRequestSchema.parse(input);

  const plan = getPlanById(validated.planId);
  if (!plan) {
    throw new Error(`Plan with ID ${validated.planId} not found`);
  }

  const planPrice = plan.price; // integer paise
  let linesSubtotal = 0;
  let totalQuantity = 0;

  const breakdown = validated.lines.map((line) => {
    const product = getProductById(line.productId);
    if (!product) {
      throw new Error(`Product with ID ${line.productId} not found`);
    }

    const basePrice = product.basePrice;
    let variantExtra = 0;
    let variantName = line.variantName || null;

    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) {
        throw new Error(
          `Variant with ID ${line.variantId} not found on product ${product.name}`
        );
      }
      variantExtra = variant.extraPrice;
      variantName = variant.name;
    }

    const unitPrice = basePrice + variantExtra;
    const lineTotal = unitPrice * line.quantity;

    linesSubtotal += lineTotal;
    totalQuantity += line.quantity;

    return {
      productId: product.id!,
      productName: product.name,
      variantId: line.variantId || null,
      variantName,
      quantity: line.quantity,
      basePrice,
      variantExtra,
      unitPrice,
      lineTotal,
    };
  });

  const grossAmount = planPrice + linesSubtotal;

  // 1. Discount calculation
  let discountAmount = 0;
  let discountDescription: string | undefined = undefined;

  if (validated.discountId) {
    const discount = getDiscountById(validated.discountId);
    if (discount) {
      const evalResult = evaluateDiscountAmount(discount, grossAmount, totalQuantity);
      if (evalResult.valid) {
        discountAmount = evalResult.discountAmountPaise;
        discountDescription = `${discount.name} (${discount.type === "PERCENTAGE" ? `${discount.value}%` : `₹${discount.value / 100}`})`;
      }
    }
  }

  const taxableAmount = Math.max(0, grossAmount - discountAmount);

  // 2. Tax calculation
  let taxRate = 0;
  let taxAmount = 0;
  let taxName: string | undefined = undefined;

  if (validated.taxId) {
    const tax = getTaxById(validated.taxId);
    if (tax && tax.active) {
      taxRate = tax.rate;
      taxName = `${tax.name} (${tax.rate}%)`;
      taxAmount = Math.round((taxableAmount * tax.rate) / 100);
    }
  }

  const totalAmount = taxableAmount + taxAmount;

  return {
    planPrice,
    linesSubtotal,
    grossAmount,
    discountAmount,
    discountDescription,
    taxableAmount,
    taxRate,
    taxAmount,
    taxName,
    totalAmount,
    breakdown,
  };
}

/**
 * List all subscriptions
 */
export function listSubscriptions(options?: {
  status?: SubscriptionStatus;
  customerId?: string;
  search?: string;
}): Subscription[] {
  let list = store.subscriptions;

  if (options?.status) {
    list = list.filter((s) => s.status === options.status);
  }

  if (options?.customerId) {
    list = list.filter((s) => s.customerId === options.customerId);
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.subscriptionNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerEmail.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Get subscription by ID
 */
export function getSubscriptionById(id: string): Subscription | null {
  return store.subscriptions.find((s) => s.id === id || s.subscriptionNumber === id) || null;
}

/**
 * Create a new subscription
 */
export function createSubscription(input: SubscriptionCreate): Subscription {
  const validated = SubscriptionCreateSchema.parse(input);

  // Server-side calculation guarantees consistency
  const priceResult = calculateSubscriptionPrice({
    planId: validated.planId,
    lines: validated.lines,
    discountId: validated.discountId,
    taxId: validated.taxId,
  });

  // Increment discount usage count if used
  if (validated.discountId) {
    const disc = getDiscountById(validated.discountId);
    if (disc) {
      disc.currentUsageCount = (disc.currentUsageCount || 0) + 1;
    }
  }

  const now = new Date().toISOString();
  const subCount = store.subscriptions.length + 1;
  const subscriptionNumber = `SUB-${new Date().getFullYear()}-${String(subCount).padStart(3, "0")}`;

  const enrichedLines = priceResult.breakdown.map((item, idx) => ({
    id: `sl-${Date.now()}-${idx}`,
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.lineTotal,
  }));

  const newSubscription: Subscription = {
    ...validated,
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    subscriptionNumber,
    status: "ACTIVE",
    planPrice: priceResult.planPrice,
    linesSubtotal: priceResult.linesSubtotal,
    discountAmount: priceResult.discountAmount,
    taxAmount: priceResult.taxAmount,
    totalAmount: priceResult.totalAmount,
    lines: enrichedLines,
    createdAt: now,
    updatedAt: now,
  };

  store.subscriptions.unshift(newSubscription);
  return newSubscription;
}

/**
 * Update subscription status (pause, close, resume, cancel)
 */
export function updateSubscriptionStatus(
  id: string,
  newStatus: SubscriptionStatus
): Subscription {
  const sub = getSubscriptionById(id);
  if (!sub) {
    throw new Error(`Subscription with ID ${id} not found`);
  }

  const plan = getPlanById(sub.planId);

  // Check plan permissions
  if (newStatus === "PAUSED" && plan && !plan.pausable) {
    throw new Error(`The subscription's plan (${plan.name}) does not permit pausing.`);
  }

  if (newStatus === "CLOSED" && plan && !plan.closable) {
    throw new Error(`The subscription's plan (${plan.name}) does not permit closing.`);
  }

  sub.status = newStatus;
  sub.updatedAt = new Date().toISOString();
  return sub;
}
