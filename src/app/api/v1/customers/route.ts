import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, HttpError, apiHandler, zodToFieldErrors } from '@/lib/http';
import { createCustomerSchema } from '@/lib/validators';

export const GET = apiHandler(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
  const q = sp.get('q') || '';
  const skip = (page - 1) * limit;

  const where = q
    ? { OR: [{ name: { contains: q } }, { company: { contains: q } }, { phone: { contains: q } }] }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subscriptions: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return ok(customers, { page, limit, total });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json();
  const data = createCustomerSchema.safeParse(body);
  if (!data.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(data.error));
  }
  const customer = await prisma.customer.create({ data: data.data });
  return created(customer);
});
