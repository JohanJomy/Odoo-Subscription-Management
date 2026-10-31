import { z } from "zod";

/**
 * Money values are ALWAYS stored in integer paise.
 * ₹1 = 100 paise.
 */

// ----------------------------------------------------
// SUBSCRIPTION LINE ITEM SCHEMA
// ----------------------------------------------------

export const SubscriptionLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required"),
  productName: z.string().optional(),
  variantId: z.string().optional().nullable(),
  variantName: z.string().optional().nullable(),
  quantity: z
    .number({
      invalid_type_error: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
  // Unit price in integer paise (base price + variant extra price)
  unitPrice: z.number().int().min(0).optional(),
  subtotal: z.number().int().min(0).optional(),
});

export type SubscriptionLine = z.infer<typeof SubscriptionLineSchema>;

// ----------------------------------------------------
// SUBSCRIPTION STATUS ENUM
// ----------------------------------------------------

export const SubscriptionStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
  "CANCELLED",
  "EXPIRED",
]);

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

// ----------------------------------------------------
// PRICE CALCULATION SCHEMAS (POST /subscriptions/price)
// ----------------------------------------------------

export const SubscriptionPriceRequestSchema = z.object({
  planId: z.string().min(1, "Plan selection is required"),
  discountId: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  lines: z
    .array(SubscriptionLineSchema)
    .min(1, "Subscription must have at least one line item"),
});

export type SubscriptionPriceRequest = z.infer<
  typeof SubscriptionPriceRequestSchema
>;

export const SubscriptionPriceResponseSchema = z.object({
  planPrice: z.number().int().min(0),
  linesSubtotal: z.number().int().min(0),
  grossAmount: z.number().int().min(0),
  discountAmount: z.number().int().min(0),
  discountDescription: z.string().optional(),
  taxableAmount: z.number().int().min(0),
  taxRate: z.number().min(0),
  taxAmount: z.number().int().min(0),
  taxName: z.string().optional(),
  totalAmount: z.number().int().min(0),
  breakdown: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      variantId: z.string().optional().nullable(),
      variantName: z.string().optional().nullable(),
      quantity: z.number(),
      basePrice: z.number().int(),
      variantExtra: z.number().int(),
      unitPrice: z.number().int(),
      lineTotal: z.number().int(),
    })
  ),
});

export type SubscriptionPriceResponse = z.infer<
  typeof SubscriptionPriceResponseSchema
>;

// ----------------------------------------------------
// SUBSCRIPTION CREATE & ENTITY SCHEMAS
// ----------------------------------------------------

export const SubscriptionCreateSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  planId: z.string().min(1, "Plan selection is required"),
  templateId: z.string().optional().nullable(),
  discountId: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required"),
  lines: z
    .array(SubscriptionLineSchema)
    .min(1, "Subscription must have at least one product line"),
  notes: z.string().optional(),
});

export type SubscriptionCreate = z.infer<typeof SubscriptionCreateSchema>;

export const SubscriptionSchema = SubscriptionCreateSchema.extend({
  id: z.string(),
  subscriptionNumber: z.string(),
  status: SubscriptionStatusEnum.default("ACTIVE"),
  planPrice: z.number().int(),
  linesSubtotal: z.number().int(),
  discountAmount: z.number().int(),
  taxAmount: z.number().int(),
  totalAmount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;
