import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError, HttpError } from '@/lib/http-error';
import { createSubscriptionSchema } from '@/lib/validators';
import { nextNumber } from '@/lib/number-generator';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
    const status = sp.get('status');
    const customerId = sp.get('customerId');
    const q = sp.get('q') || '';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (q) {
      where.OR = [
        { number: { contains: q } },
        { customer: { name: { contains: q } } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          plan: { select: { id: true, name: true, billingPeriod: true } },
          _count: { select: { invoices: true, lines: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return apiSuccess(subscriptions, { page, limit, total });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed',
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }

    const { customerId, planId, startDate, expiryDate, paymentTerm, lines } = parsed.data;

    // Validate customer & plan exist
    const [customer, plan] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ]);

    if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Plan not found');

    // Enforce plan minimum quantity
    const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
    if (totalQty < plan.minQty) {
      throw new HttpError(422, 'MINIMUM_QUANTITY_NOT_MET',
        `Total quantity must be at least the plan minimum of ${plan.minQty}`
      );
    }

    const subscription = await prisma.$transaction(async (tx) => {
      // Generate sequential human-readable number
      const number = await nextNumber(tx, 'SUB');

      // Build line descriptions with product + variant info
      const lineData = await Promise.all(
        lines.map(async (l) => {
          const product = await tx.product.findUnique({
            where: { id: l.productId },
            include: { variants: true },
          });
          if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', `Product ${l.productId} not found`);

          let variantExtra = 0;
          let description = product.name;

          if (l.variantId) {
            const variant = product.variants.find((v) => v.id === l.variantId);
            if (!variant) throw new HttpError(404, 'VARIANT_NOT_FOUND', `Variant ${l.variantId} not found`);
            variantExtra = variant.extraPrice;
            description = `${product.name} (${variant.attribute}: ${variant.value})`;
          }

          const unitPrice = product.salesPrice + variantExtra;
          return {
            productId: l.productId,
            variantId: l.variantId ?? null,
            taxId: l.taxId ?? null,
            description,
            qty: l.qty,
            unitPrice,
            amount: l.qty * unitPrice,
          };
        })
      );

      const sub = await tx.subscription.create({
        data: {
          number,
          customerId,
          planId,
          startDate,
          expiryDate,
          paymentTerm,
          status: 'DRAFT',   // Always starts as DRAFT
          lines: { create: lineData },
        },
        include: {
          lines: true,
          plan: true,
          customer: { select: { id: true, name: true, company: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          entity: 'Subscription',
          entityId: sub.id,
          action: 'CREATED',
          detail: `Subscription ${number} created in DRAFT`,
        },
      });

      return sub;
    });

    return apiSuccess(subscription, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

