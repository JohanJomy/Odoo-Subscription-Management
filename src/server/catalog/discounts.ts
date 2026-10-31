import { Discount, DiscountSchema, canModifyPricing, UserRole } from "@/lib/schemas";
import { store } from "./storage";

/**
 * List discounts
 */
export function listDiscounts(options?: {
  activeOnly?: boolean;
  target?: "PRODUCT" | "SUBSCRIPTION";
  search?: string;
}): Discount[] {
  let list = store.discounts;

  if (options?.activeOnly) {
    const now = new Date();
    list = list.filter((d) => {
      if (!d.active) return false;
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      if (now < start || now > end) return false;
      if (d.maxUsageLimit && d.currentUsageCount >= d.maxUsageLimit) return false;
      return true;
    });
  }

  if (options?.target) {
    list = list.filter((d) => d.target === options.target);
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    list = list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Get discount by ID or Code
 */
export function getDiscountById(id: string): Discount | null {
  return store.discounts.find((d) => d.id === id || d.code.toUpperCase() === id.toUpperCase()) || null;
}

/**
 * Create discount (Role restricted: Admin only)
 */
export function createDiscount(input: Omit<Discount, "id" | "currentUsageCount">, role: UserRole = "STAFF"): Discount {
  if (!canModifyPricing(role)) {
    throw new Error("Forbidden: Staff cannot create or modify discounts. Admin role is required.");
  }

  const validated = DiscountSchema.parse(input);

  // Check unique code
  if (store.discounts.some((d) => d.code === validated.code)) {
    throw new Error(`Discount code "${validated.code}" already exists.`);
  }

  const newDiscount: Discount = {
    ...validated,
    id: `disc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    currentUsageCount: 0,
  };

  store.discounts.unshift(newDiscount);
  return newDiscount;
}

/**
 * Update discount (Role restricted: Admin only)
 */
export function updateDiscount(id: string, input: Partial<Discount>, role: UserRole = "STAFF"): Discount {
  if (!canModifyPricing(role)) {
    throw new Error("Forbidden: Staff cannot create or modify discounts. Admin role is required.");
  }

  const index = store.discounts.findIndex((d) => d.id === id);
  if (index === -1) {
    throw new Error(`Discount with ID ${id} not found`);
  }

  const existing = store.discounts[index];
  const merged = { ...existing, ...input, id: existing.id };
  const validated = DiscountSchema.parse(merged);

  store.discounts[index] = validated;
  return validated;
}

/**
 * Evaluate discount on a purchase
 * Returns discount amount in integer paise
 */
export function evaluateDiscountAmount(
  discount: Discount,
  grossAmountPaise: number,
  totalQuantity: number = 1
): { valid: boolean; discountAmountPaise: number; reason?: string } {
  if (!discount.active) {
    return { valid: false, discountAmountPaise: 0, reason: "Discount is inactive" };
  }

  const now = new Date();
  if (new Date(discount.startDate) > now) {
    return { valid: false, discountAmountPaise: 0, reason: "Discount campaign has not started yet" };
  }
  if (new Date(discount.endDate) < now) {
    return { valid: false, discountAmountPaise: 0, reason: "Discount campaign has expired" };
  }

  if (discount.maxUsageLimit && discount.currentUsageCount >= discount.maxUsageLimit) {
    return { valid: false, discountAmountPaise: 0, reason: "Discount usage limit reached" };
  }

  if (discount.minPurchaseAmount && grossAmountPaise < discount.minPurchaseAmount) {
    return {
      valid: false,
      discountAmountPaise: 0,
      reason: `Minimum purchase amount of ₹${(discount.minPurchaseAmount / 100).toLocaleString()} required`,
    };
  }

  if (discount.minQuantity && totalQuantity < discount.minQuantity) {
    return {
      valid: false,
      discountAmountPaise: 0,
      reason: `Minimum quantity of ${discount.minQuantity} items required`,
    };
  }

  let discountAmountPaise = 0;
  if (discount.type === "PERCENTAGE") {
    // value is percentage, e.g. 10 for 10%
    discountAmountPaise = Math.round((grossAmountPaise * discount.value) / 100);
  } else {
    // FIXED amount in paise
    discountAmountPaise = Math.min(grossAmountPaise, Math.round(discount.value));
  }

  return {
    valid: true,
    discountAmountPaise,
  };
}
