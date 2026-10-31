import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/http-error';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      prisma.billingRun.findMany({
        skip,
        take: limit,
        orderBy: { ranAt: 'desc' },
      }),
      prisma.billingRun.count(),
    ]);

    return apiSuccess(runs, { page, limit, total });
  } catch (err) {
    return apiError(err);
  }
}

