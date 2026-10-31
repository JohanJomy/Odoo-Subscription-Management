import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, HttpError, apiHandler } from '@/lib/http';
import { requireRole } from '@/server/auth/guard';
import { priceSubscription, PricingLineInput, DiscountCandidate } from '@/server/billing/pricing';
import { BillingPeriod, PaymentTerm } from '@/lib/constants';

export const POST = apiHandler(async (request: NextRequest) => {
  await requireRole(['ADMIN', 'STAFF', 'CUSTOMER'], request);
  const body = await request.json();
  const { planId, lines, subscriptionId, paymentTerm, invoiceDate } = body;

  if (!planId) throw new HttpError(422, 'MISSING_PLAN_ID', 'planId is required');

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Selected plan does not exist');

  const lineInputs: PricingLineInput[] = [];
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

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          extraPrice = variant.extraPrice;
          variantAttribute = variant.attribute;
          variantValue = variant.value;
        }
      }

      lineInputs.push({
        productId: product.id,
        productName: product.name,
        variantId: item.variantId,
        variantAttribute,
        variantValue,
        variantExtraPrice: extraPrice,
        salesPrice: product.salesPrice,
        qty: item.qty || 1,
        taxId: item.taxId,
        taxRatePercent: 18,
      });
    }
  }

  const discounts = await prisma.discount.findMany({ where: { active: true } });
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

  const result = priceSubscription({
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      billingPeriod: plan.billingPeriod as BillingPeriod,
    },
    lines: lineInputs,
    discounts: discountCandidates,
    defaultTaxRatePercent: 18,
    subscriptionId,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    paymentTerm: paymentTerm as PaymentTerm,
  });

  return ok(result);
});
