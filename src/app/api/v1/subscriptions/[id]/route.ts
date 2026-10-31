import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, HttpError, apiHandler, zodToFieldErrors } from '@/lib/http';
import { requireRole, scopeToCustomer } from '@/server/auth/guard';
import { updateSubscriptionSchema } from '@/lib/validators';

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireRole(['ADMIN', 'STAFF', 'CUSTOMER'], request);
  const { id } = await context.params;

  const scope = scopeToCustomer(user);

  const sub = await prisma.subscription.findUnique({
    where: { id, ...scope },
    include: {
      customer: { select: { id: true, name: true, company: true, phone: true } },
      plan: true,
      lines: {
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, attribute: true, value: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          total: true,
          paidTotal: true,
          dueDate: true,
        },
      },
    },
  });

  if (!sub) throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');

  const audit = await prisma.auditLog.findMany({
    where: { entity: 'Subscription', entityId: id },
    orderBy: { at: 'desc' },
    take: 50,
  });

  return ok({ ...sub, audit });
});

/**
 * PATCH is only allowed while status = 'DRAFT'.
 * Once a subscription moves to QUOTATION or beyond, lines are locked.
 */
export const PATCH = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireRole(['ADMIN', 'STAFF'], request);
  const { id } = await context.params;
  const body = await request.json();

  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');

  if (sub.status !== 'DRAFT') {
    throw new HttpError(409, 'SUBSCRIPTION_LOCKED',
      'Subscription can only be edited while in DRAFT status. Current status: ' + sub.status
    );
  }

  const parsed = updateSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(parsed.error));
  }

  const { lines, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (lines !== undefined) {
      await tx.subscriptionLine.deleteMany({ where: { subscriptionId: id } });

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
            if (variant) {
              variantExtra = variant.extraPrice;
              description = `${product.name} (${variant.attribute}: ${variant.value})`;
            }
          }

          const unitPrice = product.salesPrice + variantExtra;
          return {
            subscriptionId: id,
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

      await tx.subscriptionLine.createMany({ data: lineData });
    }

    const result = await tx.subscription.update({
      where: { id },
      data: rest,
      include: { lines: true, plan: true, customer: true },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Subscription',
        entityId: id,
        action: 'UPDATED',
        userId: user.id,
        detail: `Subscription ${sub.number} updated while in DRAFT`,
      },
    });

    return result;
  });

  return ok(updated);
});
