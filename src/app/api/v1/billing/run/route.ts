import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiHandler } from '@/lib/http';
import { runBilling } from '@/server/billing/run';

export const POST = apiHandler(async (request: NextRequest) => {
  let date = new Date();
  try {
    const body = await request.json();
    if (body?.date) date = new Date(body.date);
  } catch { /* empty body is fine */ }
  const result = await runBilling(prisma, date);
  return ok(result);
});
