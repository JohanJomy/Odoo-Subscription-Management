import { z } from "zod";

/**
 * Money values are ALWAYS stored in integer paise.
 * ₹1 = 100 paise.
 */

// ----------------------------------------------------
// TAX SCHEMAS
// ----------------------------------------------------

export const TaxSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Tax name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  /**
   * Tax rate percentage, e.g. 18 for 18% GST, 5 for 5% Reduced tax
   */
  rate: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type Tax = z.infer<typeof TaxSchema>;

// ----------------------------------------------------
// DISCOUNT SCHEMAS
// ----------------------------------------------------

export const DiscountTypeEnum = z.enum(["PERCENTAGE", "FIXED"]);
export type DiscountType = z.infer<typeof DiscountTypeEnum>;

export const DiscountTargetEnum = z.enum(["PRODUCT", "SUBSCRIPTION"]);
export type DiscountTarget = z.infer<typeof DiscountTargetEnum>;

export const DiscountSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Discount name is required"),
    code: z
      .string()
      .min(1, "Discount code is required")
      .transform((val) => val.trim().toUpperCase()),
    description: z.string().optional(),
    type: DiscountTypeEnum.default("PERCENTAGE"),
    /**
     * If type is PERCENTAGE: value is 0.01 - 100 (e.g. 10 for 10%)
     * If type is FIXED: value is integer paise (e.g. 50000 for ₹500)
     */
    value: z
      .number()
      .min(0.01, "Discount value must be greater than 0"),
    target: DiscountTargetEnum.default("SUBSCRIPTION"),
    // Product ID if target is PRODUCT
    productId: z.string().optional().nullable(),
    // Thresholds
    minPurchaseAmount: z
      .number()
      .int("Minimum purchase amount must be in paise")
      .min(0, "Minimum purchase amount cannot be negative")
      .optional()
      .nullable(),
    minQuantity: z
      .number()
      .int("Minimum quantity must be an integer")
      .min(1, "Minimum quantity must be at least 1")
      .optional()
      .nullable(),
    // Usage limits
    maxUsageLimit: z
      .number()
      .int("Max usage limit must be an integer")
      .min(1, "Max usage limit must be at least 1")
      .optional()
      .nullable(),
    currentUsageCount: z.number().int().default(0),
    // Validity dates
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // Percentage discounts cannot exceed 100%
      if (data.type === "PERCENTAGE" && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      // Fixed discounts must be stored in whole integer paise
      if (data.type === "FIXED" && !Number.isInteger(data.value)) {
        return false;
      }
      return true;
    },
    {
      message: "Fixed discount amount must be an integer in paise",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      // End date cannot be earlier than start date
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date cannot be earlier than start date",
      path: ["endDate"],
    }
  );

export type Discount = z.infer<typeof DiscountSchema>;

// Role permission check helper
export type UserRole = "ADMIN" | "STAFF";

export function canModifyPricing(role: UserRole = "STAFF"): boolean {
  return role === "ADMIN";
}
