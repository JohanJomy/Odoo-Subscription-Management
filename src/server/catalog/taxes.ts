import { Tax, TaxSchema, canModifyPricing, UserRole } from "@/lib/schemas";
import { store } from "./storage";

/**
 * List all taxes
 */
export function listTaxes(options?: { activeOnly?: boolean; search?: string }): Tax[] {
  let list = store.taxes;

  if (options?.activeOnly) {
    list = list.filter((t) => t.active);
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.code && t.code.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Get tax by ID
 */
export function getTaxById(id: string): Tax | null {
  return store.taxes.find((t) => t.id === id) || null;
}

/**
 * Create tax (Role restricted: Admin only)
 */
export function createTax(input: Omit<Tax, "id">, role: UserRole = "STAFF"): Tax {
  if (!canModifyPricing(role)) {
    throw new Error("Forbidden: Staff cannot create or modify taxes. Admin role is required.");
  }

  const validated = TaxSchema.parse(input);

  // If set to default, clear default from others
  if (validated.isDefault) {
    store.taxes.forEach((t) => (t.isDefault = false));
  }

  const newTax: Tax = {
    ...validated,
    id: `tax-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  store.taxes.unshift(newTax);
  return newTax;
}

/**
 * Update tax (Role restricted: Admin only)
 */
export function updateTax(id: string, input: Partial<Tax>, role: UserRole = "STAFF"): Tax {
  if (!canModifyPricing(role)) {
    throw new Error("Forbidden: Staff cannot create or modify taxes. Admin role is required.");
  }

  const index = store.taxes.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Tax with ID ${id} not found`);
  }

  const existing = store.taxes[index];
  const merged = { ...existing, ...input, id: existing.id };
  const validated = TaxSchema.parse(merged);

  if (validated.isDefault && !existing.isDefault) {
    store.taxes.forEach((t) => {
      if (t.id !== id) t.isDefault = false;
    });
  }

  store.taxes[index] = validated;
  return validated;
}
