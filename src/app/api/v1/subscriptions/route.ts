import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, HttpError, apiHandler, zodToFieldErrors, parsePagination } from '@/lib/http';
import { requireRole, scopeToCustomer } from '@/server/auth/guard';
import { createSubscriptionSchema } from '@/lib/validators';
import { nextNumber } from '@/lib/number-generator';

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await requireRole(['ADMIN', 'STAFF', 'CUSTOMER'], request);
  const { page, limit, skip, searchParams } = parsePagination(request.url);

  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');
  const q = searchParams.get('q') || searchParams.get('search') || '';

  const scope = scopeToCustomer(user);

  const where: Record<string, unknown> = { ...scope };
  if (status) where.status = status;
  // ADMIN/STAFF can filter by customerId; CUSTOMER is already scoped
  if (customerId && user.role !== 'CUSTOMER') where.customerId = customerId;
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
        plan: { select: { id: true, name: true, billingPeriod: true, price: true } },
        lines: true,
        _count: { select: { invoices: true, lines: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  return ok(subscriptions, { page, limit, total });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireRole(['ADMIN', 'STAFF'], request);
  const body = await request.json();

  // Normalize incoming body fields for compatibility with P3 UI and P2 API
  if (body.lines && Array.isArray(body.lines)) {
    body.lines = body.lines.map((l: any) => ({
      ...l,
      qty: l.qty ?? l.quantity ?? 1,
    }));
  }
  if (!body.paymentTerm) {
    body.paymentTerm = 'IMMEDIATE';
  }
  if (!body.expiryDate && body.startDate) {
    const s = new Date(body.startDate);
    s.setMonth(s.getMonth() + 1);
    body.expiryDate = s;
  }

  if (body.customerEmail || body.customerName) {
    let cust = body.customerId ? await prisma.customer.findUnique({ where: { id: body.customerId } }) : null;
    if (!cust) {
      if (body.customerEmail) {
        const existingUser = await prisma.user.findUnique({
          where: { email: body.customerEmail },
          include: { customer: true },
        });
        if (existingUser?.customer) {
          body.customerId = existingUser.customer.id;
        } else {
          const firstCust = await prisma.customer.findFirst();
          if (firstCust) {
            body.customerId = firstCust.id;
          } else {
            const newCust = await prisma.customer.create({
              data: {
                name: body.customerName || body.customerEmail.split('@')[0],
                company: 'Acme Enterprise',
              },
            });
            body.customerId = newCust.id;
          }
        }
      } else {
        const firstCust = await prisma.customer.findFirst();
        if (firstCust) {
          body.customerId = firstCust.id;
        }
      }
    }
  }

  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(parsed.error));
  }

  const { customerId, planId, startDate, expiryDate, paymentTerm, lines } = parsed.data;

  const [customer, plan] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);

  if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Plan not found');

  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  if (totalQty < plan.minQty) {
    throw new HttpError(422, 'MINIMUM_QUANTITY_NOT_MET',
      `Total quantity must be at least the plan minimum of ${plan.minQty}`
    );
  }

  const subscription = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, 'SUB');

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
        status: 'DRAFT',
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
        action: 'CREATED',
        userId: user.id,
        detail: `Subscription ${number} created in DRAFT`,
      },
    });

    return sub;
  });

  return created(subscription);
});
