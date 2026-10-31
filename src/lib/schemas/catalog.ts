import { z } from "zod";

/**
 * Money values are ALWAYS stored in integer paise.
 * ₹1 = 100 paise.
 * ₹1,000 = 100000 paise.
 * ₹560 = 56000 paise.
 */

// ----------------------------------------------------
// PRODUCT & VARIANT SCHEMAS
// ----------------------------------------------------

export const ProductVariantSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().optional(),
  extraPrice: z
    .number()
    .int("Price must be an integer (paise)")
    .min(0, "Extra price cannot be negative"),
  active: z.boolean().default(true),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  code: z.string().min(1, "Product code/SKU is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  basePrice: z
    .number()
    .int("Price must be an integer (paise)")
    .min(0, "Base price cannot be negative"),
  active: z.boolean().default(true),
  variants: z.array(ProductVariantSchema).default([]),
});

export type Product = z.infer<typeof ProductSchema>;

// ----------------------------------------------------
// PLAN SCHEMAS
// ----------------------------------------------------

export const BillingPeriodEnum = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "BIANNUAL",
  "ANNUAL",
]);

export type BillingPeriod = z.infer<typeof BillingPeriodEnum>;

export const PlanSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Plan name is required"),
  code: z.string().min(1, "Plan code is required"),
  description: z.string().optional(),
  price: z
    .number()
    .int("Price must be an integer in paise")
    .min(0, "Plan price cannot be negative"),
  billingPeriod: BillingPeriodEnum.default("MONTHLY"),
  minQuantity: z.number().int().min(1, "Minimum quantity must be at least 1").default(1),
  // The Four Important Switches:
  closable: z.boolean().default(true),
  pausable: z.boolean().default(true),
  renewable: z.boolean().default(true),
  autoClose: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type Plan = z.infer<typeof PlanSchema>;

// Plan action schema (close, pause, renew, activate)
export const PlanActionSchema = z.object({
  action: z.enum(["close", "pause", "resume", "renew", "activate", "deactivate"]),
  reason: z.string().optional(),
});

export type PlanAction = z.infer<typeof PlanActionSchema>;

// ----------------------------------------------------
// QUOTATION TEMPLATE SCHEMAS
// ----------------------------------------------------

export const QuotationTemplateLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required"),
  productName: z.string().optional(),
  variantId: z.string().optional().nullable(),
  variantName: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().int().min(0, "Price cannot be negative").optional(),
});

export type QuotationTemplateLine = z.infer<typeof QuotationTemplateLineSchema>;

export const QuotationTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  planId: z.string().min(1, "Default plan selection is required"),
  planName: z.string().optional(),
  lines: z
    .array(QuotationTemplateLineSchema)
    .min(1, "At least one product line is required in a template"),
  active: z.boolean().default(true),
});

export type QuotationTemplate = z.infer<typeof QuotationTemplateSchema>;
