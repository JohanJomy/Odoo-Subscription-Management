export const USER_ROLES = ["ADMIN", "STAFF", "CUSTOMER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_STATUSES = [
  "DRAFT",
  "QUOTATION",
  "CONFIRMED",
  "ACTIVE",
  "CLOSED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const CLOSE_REASONS = [
  "EXPIRED",
  "CLOSED_EARLY",
  "RENEWED",
  "PAUSED",
] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export const INVOICE_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PAID",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_TERMS = ["IMMEDIATE", "NET15", "NET30"] as const;
export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

export const PRODUCT_TYPES = ["SOFTWARE", "ADDON", "SERVICE"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const BILLING_PERIODS = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const DISCOUNT_TYPES = ["FIXED", "PERCENT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// P1 name: DISCOUNT_APPLIES_TO | P2 alias: DISCOUNT_SCOPES — both exported for compatibility
export const DISCOUNT_APPLIES_TO = ["PRODUCT", "SUBSCRIPTION"] as const;
export type DiscountAppliesTo = (typeof DISCOUNT_APPLIES_TO)[number];
export const DISCOUNT_SCOPES = DISCOUNT_APPLIES_TO;
export type DiscountScope = DiscountAppliesTo;

export const SESSION_COOKIE_NAME = "session";

// 9+ chars with at least one uppercase, one lowercase, one special character
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
