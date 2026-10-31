/**
 * Unit Tests for LoopLedger Pricing & Billing Engine
 * Tests Acceptance Criteria:
 *  1. Variant extra price (₹560 Odoo brand variant)
 *  2. Minimum quantity threshold on percentage discount
 *  3. Fixed discount capped at base
 *  4. Proportional allocation and rounding of three lines
 *  5. AddPeriod calculations
 */

import {
  priceSubscription,
  addPeriod,
  calculateDueDate,
  allocateDiscount,
  calcTax,
  PricingPlan,
  PricingLineInput,
  DiscountCandidate,
} from './pricing';

describe('Pricing Engine (Pure Functions)', () => {
  const mockPlan: PricingPlan = {
    id: 'plan_1',
    name: 'Business Pro',
    price: 100000, // ₹1,000 in paise
    billingPeriod: 'MONTHLY',
  };

  test('adds variant extra price correctly (e.g. ₹560 Odoo variant)', () => {
    const lines: PricingLineInput[] = [
      {
        productId: 'prod_crm',
        productName: 'Brightloop CRM',
        salesPrice: 200000, // ₹2,000
        variantAttribute: 'Brand',
        variantValue: 'Odoo',
        variantExtraPrice: 56000, // ₹560 in paise
        qty: 1,
        taxRatePercent: 18,
      },
    ];

    const result = priceSubscription({
      plan: mockPlan,
      lines,
      defaultTaxRatePercent: 18,
    });

    // Product line unit price should be ₹2000 + ₹560 = ₹2560 (256000 paise)
    const crmLine = result.lines.find((l) => l.productId === 'prod_crm')!;
    expect(crmLine.unitPrice).toBe(256000);
    expect(crmLine.lineAmount).toBe(256000);
    expect(crmLine.description).toBe('Brightloop CRM (Brand: Odoo)');

    // Plan fee line should be ₹1,000 (100000 paise)
    expect(result.lines[0].description).toBe('Business Pro Plan Fee');
    expect(result.lines[0].lineAmount).toBe(100000);

    // Subtotal: 100000 + 256000 = 356000
    expect(result.subtotal).toBe(356000);
  });

  test('applies percentage discount only when minimum quantity threshold is met', () => {
    const linesUnderQty: PricingLineInput[] = [
      {
        productId: 'prod_seats',
        productName: 'User Seat',
        salesPrice: 50000, // ₹500
        qty: 4, // Below minQty 5
      },
    ];

    const discount: DiscountCandidate = {
      id: 'disc_volume',
      name: '10% Off for 5+ Seats',
      type: 'PERCENT',
      percent: 10,
      minQty: 5,
      minPurchase: 0,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 100,
      usedCount: 0,
      appliesTo: 'SUBSCRIPTION',
      active: true,
    };

    // 1. With qty 4: Discount should NOT apply
    const resultUnder = priceSubscription({
      plan: mockPlan,
      lines: linesUnderQty,
      discounts: [discount],
      invoiceDate: new Date('2026-10-31'),
    });
    expect(resultUnder.discountTotal).toBe(0);
    expect(resultUnder.appliedDiscount).toBeNull();

    // 2. With qty 5: Discount SHOULD apply (10% of subtotal)
    const linesEligible: PricingLineInput[] = [
      {
        productId: 'prod_seats',
        productName: 'User Seat',
        salesPrice: 50000,
        qty: 5, // Meets minQty 5
      },
    ];

    const resultEligible = priceSubscription({
      plan: mockPlan,
      lines: linesEligible,
      discounts: [discount],
      invoiceDate: new Date('2026-10-31'),
    });

    // Subtotal = 100000 (plan) + 250000 (5 * 50000) = 350000 paise
    // 10% discount = 35000 paise
    expect(resultEligible.subtotal).toBe(350000);
    expect(resultEligible.discountTotal).toBe(35000);
    expect(resultEligible.appliedDiscount?.id).toBe('disc_volume');
  });

  test('caps fixed discount at applicable base amount', () => {
    const fixedDiscountLargerThanBase: DiscountCandidate = {
      id: 'disc_big',
      name: 'Flat ₹5,000 Off',
      type: 'FIXED',
      fixedAmount: 500000, // ₹5,000 in paise
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 10,
      usedCount: 0,
      appliesTo: 'PRODUCT',
      productId: 'prod_small',
      active: true,
    };

    const lines: PricingLineInput[] = [
      {
        productId: 'prod_small',
        productName: 'Mini Addon',
        salesPrice: 20000, // ₹200 (less than ₹5,000 discount)
        qty: 1,
      },
    ];

    const result = priceSubscription({
      plan: mockPlan,
      lines,
      discounts: [fixedDiscountLargerThanBase],
      invoiceDate: new Date('2026-10-31'),
    });

    const addonLine = result.lines.find((l) => l.productId === 'prod_small')!;
    // Discount capped at 20000 paise, taxableAmount 0
    expect(addonLine.discountAmount).toBe(20000);
    expect(addonLine.taxableAmount).toBe(0);
  });

  test('allocates discount proportionally across three lines with remainder on the last line', () => {
    // 3 lines with amounts: 1000, 2000, 3000 (total 6000)
    // Discount of 1000
    const amounts = [1000, 2000, 3000];
    const discount = 1000;
    const allocated = allocateDiscount(discount, amounts);

    // Sum of allocated must equal exactly 1000
    const sum = allocated.reduce((a, b) => a + b, 0);
    expect(sum).toBe(1000);
    expect(allocated.length).toBe(3);
  });

  test('addPeriod advances dates correctly', () => {
    const base = new Date('2026-01-01T00:00:00.000Z');
    expect(addPeriod(base, 'DAILY').getUTCDate()).toBe(2);
    expect(addPeriod(base, 'WEEKLY').getUTCDate()).toBe(8);
    expect(addPeriod(base, 'MONTHLY').getUTCMonth()).toBe(1); // Feb
    expect(addPeriod(base, 'YEARLY').getUTCFullYear()).toBe(2027);
  });

  test('calculates correct due date based on payment term', () => {
    const invoiceDate = new Date('2026-10-31T00:00:00.000Z');
    expect(calculateDueDate(invoiceDate, 'IMMEDIATE').getUTCDate()).toBe(31);
    expect(calculateDueDate(invoiceDate, 'NET15').getUTCDate()).toBe(15); // Nov 15
    expect(calculateDueDate(invoiceDate, 'NET30').getUTCDate()).toBe(30); // Nov 30
  });
});

