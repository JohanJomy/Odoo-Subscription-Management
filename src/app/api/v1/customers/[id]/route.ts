import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, HttpError, apiHandler, zodToFieldErrors } from '@/lib/http';
import { updateCustomerSchema } from '@/lib/validators';

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' }, take: 10,
        select: {
          id: true, number: true, status: true, closeReason: true,
          startDate: true, expiryDate: true,
          plan: { select: { name: true, billingPeriod: true } },
        },
      },
      _count: { select: { subscriptions: true } },
    },
  });
  if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  return ok(customer);
});

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const body = await request.json();
  const data = updateCustomerSchema.safeParse(body);
  if (!data.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(data.error));
  }
  const exists = await prisma.customer.findUnique({ where: { id } });
  if (!exists) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  const updated = await prisma.customer.update({ where: { id }, data: data.data });
  return ok(updated);
});
