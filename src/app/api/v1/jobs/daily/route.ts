import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiHandler, HttpError } from '@/lib/http';
import { runHousekeeping, runBilling } from '@/server/billing/run';

export const POST = apiHandler(async (request: NextRequest) => {
  const secret = request.headers.get('x-job-secret');
  if (process.env.JOB_SECRET && secret !== process.env.JOB_SECRET) {
    throw new HttpError(401, 'UNAUTHORIZED_JOB', 'Invalid x-job-secret header');
  }
  const today = new Date();
  await runHousekeeping(prisma, today);
  const summary = await runBilling(prisma, today);
  return ok({ message: 'Daily job complete', summary });
});
