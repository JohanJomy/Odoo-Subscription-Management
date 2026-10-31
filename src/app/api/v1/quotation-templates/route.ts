import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, HttpError, apiHandler, zodToFieldErrors } from '@/lib/http';
import { createQuotationTemplateSchema } from '@/lib/validators';

export const GET = apiHandler(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
  const skip = (page - 1) * limit;

  const [templates, total] = await Promise.all([
    prisma.quotationTemplate.findMany({
      skip, take: limit, orderBy: { name: 'asc' },
      include: {
        plan: { select: { id: true, name: true, billingPeriod: true, price: true } },
        lines: true,
      },
    }),
    prisma.quotationTemplate.count(),
  ]);
  return ok(templates, { page, limit, total });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json();
  const parsed = createQuotationTemplateSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(parsed.error));
  }
  const { name, validityDays, planId, lines } = parsed.data;
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Selected plan does not exist');

  const template = await prisma.quotationTemplate.create({
    data: { name, validityDays, planId, lines: { create: lines } },
    include: { lines: true, plan: true },
  });
  return created(template);
});
