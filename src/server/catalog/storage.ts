import {
  Product,
  Plan,
  QuotationTemplate,
  Tax,
  Discount,
  Subscription,
} from "@/lib/schemas";

/**
 * In-memory persistence store for catalog & subscription administration.
 * Adheres to integer paise rule:
 * - ₹1,000 = 100000 paise
 * - ₹560 = 56000 paise
 * - ₹2,000 = 200000 paise
 */

export interface CatalogStore {
  products: Product[];
  plans: Plan[];
  taxes: Tax[];
  discounts: Discount[];
  templates: QuotationTemplate[];
  subscriptions: Subscription[];
}

// Initial seed data as specified in LoopLedger requirements
const initialData: CatalogStore = {
  products: [
    {
      id: "prod-biz-soft",
      name: "Business Software",
      code: "BIZ-SOFT-01",
      description: "Complete ERP and subscription business software suite",
      category: "Software",
      basePrice: 100000, // ₹1,000
      active: true,
      variants: [
        {
          id: "var-odoo",
          productId: "prod-biz-soft",
          name: "Odoo",
          sku: "BIZ-SOFT-ODOO",
          extraPrice: 56000, // +₹560 (Total ₹1,560 = 156000 paise)
          active: true,
        },
        {
          id: "var-pro",
          productId: "prod-biz-soft",
          name: "Enterprise Add-on",
          sku: "BIZ-SOFT-ENT",
          extraPrice: 100000, // +₹1,000
          active: true,
        },
      ],
    },
    {
      id: "prod-cloud-host",
      name: "Dedicated Cloud Hosting",
      code: "CLOUD-HOST-01",
      description: "High performance secure cloud container hosting",
      category: "Infrastructure",
      basePrice: 250000, // ₹2,500
      active: true,
      variants: [
        {
          id: "var-backup",
          productId: "prod-cloud-host",
          name: "Automated Daily Backups",
          sku: "CLOUD-BAK",
          extraPrice: 50000, // +₹500
          active: true,
        },
      ],
    },
  ],
  plans: [
    {
      id: "plan-monthly-biz",
      name: "Monthly Business Plan",
      code: "PLAN-BIZ-M",
      description: "Standard monthly recurring subscription plan",
      price: 200000, // ₹2,000 / month
      billingPeriod: "MONTHLY",
      minQuantity: 1,
      closable: true,
      pausable: true,
      renewable: true,
      autoClose: false,
      active: true,
    },
    {
      id: "plan-annual-pro",
      name: "Annual Enterprise Plan",
      code: "PLAN-ENT-Y",
      description: "Discounted annual billing plan with priority support",
      price: 2000000, // ₹20,000 / year
      billingPeriod: "ANNUAL",
      minQuantity: 1,
      closable: true,
      pausable: false,
      renewable: true,
      autoClose: false,
      active: true,
    },
  ],
  taxes: [
    {
      id: "tax-gst-18",
      name: "GST",
      code: "GST-18",
      description: "Standard Goods & Services Tax (18%)",
      rate: 18,
      active: true,
      isDefault: true,
    },
    {
      id: "tax-reduced-5",
      name: "Reduced tax",
      code: "RED-5",
      description: "Reduced tax bracket (5%)",
      rate: 5,
      active: true,
      isDefault: false,
    },
    {
      id: "tax-zero-0",
      name: "Zero Tax / Exempt",
      code: "EXEMPT-0",
      description: "Zero tax rate for exports or exempt services",
      rate: 0,
      active: true,
      isDefault: false,
    },
  ],
  discounts: [
    {
      id: "disc-summer-10",
      name: "Summer Launch 10%",
      code: "SUMMER10",
      description: "10% discount on subscription orders over ₹5,000",
      type: "PERCENTAGE",
      value: 10, // 10%
      target: "SUBSCRIPTION",
      productId: null,
      minPurchaseAmount: 500000, // ₹5,000 in paise
      minQuantity: 1,
      maxUsageLimit: 100,
      currentUsageCount: 4,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.000Z",
      active: true,
    },
    {
      id: "disc-welcome-500",
      name: "Welcome Flat ₹500 Off",
      code: "WELCOME500",
      description: "Flat ₹500 discount for new business subscriptions",
      type: "FIXED",
      value: 50000, // ₹500 in paise
      target: "SUBSCRIPTION",
      productId: null,
      minPurchaseAmount: 200000, // ₹2,000 in paise
      minQuantity: 1,
      maxUsageLimit: 50,
      currentUsageCount: 12,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.000Z",
      active: true,
    },
  ],
  templates: [
    {
      id: "tmpl-standard-biz",
      name: "Standard Business Template",
      description: "Pre-configured bundle with Business Software & Odoo variant",
      planId: "plan-monthly-biz",
      planName: "Monthly Business Plan",
      active: true,
      lines: [
        {
          id: "tl-1",
          productId: "prod-biz-soft",
          productName: "Business Software",
          variantId: "var-odoo",
          variantName: "Odoo",
          quantity: 1,
          unitPrice: 156000, // ₹1,560 in paise
        },
      ],
    },
  ],
  subscriptions: [
    {
      id: "sub-1001",
      subscriptionNumber: "SUB-2026-001",
      customerId: "cust-01",
      customerName: "Acme Corp Ltd",
      customerEmail: "billing@acme.com",
      planId: "plan-monthly-biz",
      templateId: "tmpl-standard-biz",
      discountId: null,
      taxId: "tax-gst-18",
      status: "ACTIVE",
      planPrice: 200000,
      linesSubtotal: 156000,
      discountAmount: 0,
      taxAmount: 64080, // 18% of (200000 + 156000 = 356000)
      totalAmount: 420080,
      startDate: "2026-10-01T00:00:00.000Z",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
      lines: [
        {
          id: "sl-1",
          productId: "prod-biz-soft",
          productName: "Business Software",
          variantId: "var-odoo",
          variantName: "Odoo",
          quantity: 1,
          unitPrice: 156000,
          subtotal: 156000,
        },
      ],
      notes: "Initial active subscription for Acme Corp",
    },
  ],
};

// Global singleton to preserve state across API routes in dev mode
const globalForStore = globalThis as unknown as {
  __catalogStore?: CatalogStore;
};

export const store: CatalogStore =
  globalForStore.__catalogStore ||
  (globalForStore.__catalogStore = JSON.parse(JSON.stringify(initialData)));

export function resetStore(): void {
  globalForStore.__catalogStore = JSON.parse(JSON.stringify(initialData));
}
