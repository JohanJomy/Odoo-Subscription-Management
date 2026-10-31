import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created, HttpError, apiHandler, zodToFieldErrors } from '@/lib/http';
import { requireRole } from '@/server/auth/guard';
import { fromTemplateSchema } from '@/lib/validators';
import { nextNumber } from '@/lib/number-generator';

/**
 * POST /api/v1/subscriptions/from-template/:templateId
 *
 * Creates a new Subscription in DRAFT status by cloning the plan
 * and product lines from a QuotationTemplate.
 *
 * IMPORTANT: There is NO separate Quotation table.
 * A quotation is a Subscription with status=DRAFT that can be
 * advanced to QUOTATION via the transition endpoint.
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> }
) => {
  const user = await requireRole(['ADMIN', 'STAFF'], request);
  const { templateId } = await context.params;
  const body = await request.json();

  const parsed = fromTemplateSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(parsed.error));
  }

  const { customerId, startDate, expiryDate, paymentTerm } = parsed.data;

  const template = await prisma.quotationTemplate.findUnique({
    where: { id: templateId },
    include: { lines: true, plan: true },
  });

  if (!template) throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Quotation template not found');

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  const subscription = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, 'SUB');

    const quoteValidUntil = new Date(startDate);
    quoteValidUntil.setDate(quoteValidUntil.getDate() + template.validityDays);

    const lineData = await Promise.all(
      template.lines.map(async (tl) => {
        const product = await tx.product.findUnique({
          where: { id: tl.productId },
          include: { variants: true },
        });

        if (!product) {
          throw new HttpError(404, 'PRODUCT_NOT_FOUND',
            `Product ${tl.productId} in template no longer exists`
          );
        }

        let variantExtra = 0;
        let description = product.name;

        if (tl.variantId) {
          const variant = product.variants.find((v) => v.id === tl.variantId);
          if (variant) {
            variantExtra = variant.extraPrice;
            description = `${product.name} (${variant.attribute}: ${variant.value})`;
          }
        }

        const unitPrice = product.salesPrice + variantExtra;
        return {
          productId: tl.productId,
          variantId: tl.variantId ?? null,
          taxId: null,
          description,
          qty: tl.qty,
          unitPrice,
          amount: tl.qty * unitPrice,
        };
      })
    );

    const sub = await tx.subscription.create({
      data: {
        number,
        customerId,
        planId: template.planId,
        startDate,
        expiryDate,
        paymentTerm,
        status: 'DRAFT',
        quoteValidUntil,
        lines: { create: lineData },
      },
      include: {
        lines: true,
        plan: true,
        customer: { select: { id: true, name: true, company: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Subscription',
        entityId: sub.id,
        action: 'CREATED_FROM_TEMPLATE',
        userId: user.id,
        detail: `Subscription ${number} created from template "${template.name}" (${templateId}) in DRAFT`,
      },
    });

    return sub;
  });

  return created(subscription);
});
