import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, HttpError, apiHandler } from '@/lib/http';
import { requireRole } from '@/server/auth/guard';
import { priceSubscription, PricingLineInput, DiscountCandidate } from '@/server/billing/pricing';
import { BillingPeriod, PaymentTerm } from '@/lib/constants';

export const POST = apiHandler(async (request: NextRequest) => {
  await requireRole(['ADMIN', 'STAFF', 'CUSTOMER'], request);
  const body = await request.json();
  const { planId, lines, subscriptionId, paymentTerm, invoiceDate, discountId, taxId } = body;

  if (!planId) throw new HttpError(422, 'MISSING_PLAN_ID', 'planId is required');

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Selected plan does not exist');

  // Fetch optional tax if taxId provided
  let defaultTaxRate = 18;
  let taxName = 'GST (18%)';
  if (taxId) {
    const tax = await prisma.tax.findUnique({ where: { id: taxId } });
    if (tax) {
      defaultTaxRate = tax.rate;
      taxName = `${tax.name} (${tax.rate}%)`;
    }
  }

  const lineInputs: PricingLineInput[] = [];
  const breakdown: any[] = [];
  let linesSubtotal = 0;

  if (lines && Array.isArray(lines)) {
    for (const item of lines) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });
      if (!product) continue;

      let extraPrice = 0;
      let variantAttribute: string | null = null;
      let variantValue: string | null = null;
      let variantName: string | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          extraPrice = variant.extraPrice;
          variantAttribute = variant.attribute;
          variantValue = variant.value;
          variantName = `${variant.attribute}: ${variant.value}`;
        }
      }

      const quantity = item.qty ?? item.quantity ?? 1;
      const unitPrice = product.salesPrice + extraPrice;
      const lineTotal = quantity * unitPrice;
      linesSubtotal += lineTotal;

      breakdown.push({
        productId: product.id,
        productName: product.name,
        variantId: item.variantId ?? null,
        variantName,
        quantity,
        basePrice: product.salesPrice,
        variantExtra: extraPrice,
        unitPrice,
        lineTotal,
      });

      lineInputs.push({
        productId: product.id,
        productName: product.name,
        variantId: item.variantId,
        variantAttribute,
        variantValue,
        variantExtraPrice: extraPrice,
        salesPrice: product.salesPrice,
        qty: quantity,
        taxId: item.taxId ?? taxId,
        taxRatePercent: defaultTaxRate,
      });
    }
  }

  // Find candidate discounts
  const discountWhere: any = { active: true };
  if (discountId) {
    discountWhere.id = discountId;
  }
  const discounts = await prisma.discount.findMany({ where: discountWhere });
  const discountCandidates: DiscountCandidate[] = discounts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type as 'FIXED' | 'PERCENT',
    fixedAmount: d.fixedAmount,
    percent: d.percent,
    minPurchase: d.minPurchase,
    minQty: d.minQty,
    startDate: d.startDate,
    endDate: d.endDate,
    usageLimit: d.usageLimit,
    usedCount: d.usedCount,
    appliesTo: d.appliesTo as 'PRODUCT' | 'SUBSCRIPTION',
    productId: d.productId,
    subscriptionId: d.subscriptionId,
    active: d.active,
  }));

  const pricingResult = priceSubscription({
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      billingPeriod: plan.billingPeriod as BillingPeriod,
    },
    lines: lineInputs,
    discounts: discountCandidates,
    defaultTaxRatePercent: defaultTaxRate,
    subscriptionId,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    paymentTerm: (paymentTerm || 'IMMEDIATE') as PaymentTerm,
  });

  // Combine P2 pricing results with P3 breakdown metadata
  const combinedResult = {
    ...pricingResult,
    planPrice: plan.price,
    linesSubtotal,
    grossAmount: pricingResult.subtotal,
    discountAmount: pricingResult.discountTotal,
    discountDescription: pricingResult.appliedDiscount?.name,
    taxableAmount: pricingResult.subtotal - pricingResult.discountTotal,
    taxRate: defaultTaxRate,
    taxAmount: pricingResult.taxTotal,
    taxName,
    totalAmount: pricingResult.total,
    breakdown,
  };

  return ok(combinedResult);
});
