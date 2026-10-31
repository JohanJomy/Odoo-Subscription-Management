import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiHandler, parsePagination } from '@/lib/http';
import { requireRole } from '@/server/auth/guard';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireRole(['ADMIN', 'STAFF'], request);
  const { page, limit, skip } = parsePagination(request.url);

  const [runs, total] = await Promise.all([
    prisma.billingRun.findMany({
      skip,
      take: limit,
      orderBy: { ranAt: 'desc' },
      include: {
        ranBy: { select: { id: true, email: true } },
      },
    }),
    prisma.billingRun.count(),
  ]);

  return ok(runs, { page, limit, total });
});
