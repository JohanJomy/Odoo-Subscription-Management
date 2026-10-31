import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────────
export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/,
      'Password must be at least 9 characters and contain uppercase, lowercase and a special character'
    ),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Customer ─────────────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  phone: z.string().regex(/^\d{7,15}$/, 'Phone must be 7-15 digits').optional(),
  address: z.string().optional(),
  gstin: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, 'Invalid GSTIN format')
    .optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Subscription ─────────────────────────────────────────────────────────
export const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  planId: z.string().min(1, 'Plan is required'),
  startDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  paymentTerm: z.enum(['IMMEDIATE', 'NET15', 'NET30']),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        qty: z.number().int().positive(),
        taxId: z.string().optional().nullable(),
      })
    )
    .min(0),
}).refine((d) => d.expiryDate > d.startDate, {
  message: 'Expiry date must be after start date',
  path: ['expiryDate'],
});

export const updateSubscriptionSchema = z.object({
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  paymentTerm: z.enum(['IMMEDIATE', 'NET15', 'NET30']).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        qty: z.number().int().positive(),
        taxId: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export const transitionSchema = z.object({
  to: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED']),
  reason: z.enum(['EXPIRED', 'CLOSED_EARLY', 'RENEWED', 'PAUSED']).optional(),
  expiryDate: z.coerce.date().optional(),
});

export const fromTemplateSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  startDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  paymentTerm: z.enum(['IMMEDIATE', 'NET15', 'NET30']),
}).refine((d) => d.expiryDate > d.startDate, {
  message: 'Expiry date must be after start date',
  path: ['expiryDate'],
});

// ─── Quotation Template ───────────────────────────────────────────────────
export const createQuotationTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  validityDays: z.number().int().positive(),
  planId: z.string().min(1, 'Plan is required'),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional().nullable(),
      qty: z.number().int().positive(),
    })
  ).min(1, 'At least one product line is required'),
});

export const updateQuotationTemplateSchema = createQuotationTemplateSchema.partial();

