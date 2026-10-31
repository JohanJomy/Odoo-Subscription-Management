import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiHandler } from '@/lib/http';
import { previewBilling } from '@/server/billing/run';

export const GET = apiHandler(async (request: NextRequest) => {
  const dateParam = request.nextUrl.searchParams.get('date');
  const billingDate = dateParam ? new Date(dateParam) : new Date();
  const result = await previewBilling(prisma, billingDate);
  return ok({ count: result.created, totalAmount: result.totalAmount, items: result.items });
});
