import { requireRole } from "@/server/auth/guard";
import { prisma } from "@/lib/prisma";
import { apiHandler, parsePagination } from "@/lib/http";

export const GET = apiHandler(async (request: Request) => {
  await requireRole(["ADMIN", "STAFF"], request);
  const { page, limit, skip } = parsePagination(request.url);
  const [total, payments] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({ orderBy: { paidOn: "desc" }, skip, take: limit }),
  ]);
  return Response.json({
    data: payments,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
