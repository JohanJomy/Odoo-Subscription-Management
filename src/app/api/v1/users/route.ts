import { Prisma } from "@prisma/client";

import { apiHandler, ok, parsePagination } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/guard";

export const GET = apiHandler(async (request: Request) => {
  await requireRole(["ADMIN"], request);

  const { page, limit, skip, searchParams } = parsePagination(request.url);
  const role = searchParams.get("role");
  const q = searchParams.get("q")?.trim();

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { company: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        customerId: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            phone: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return ok(users, { page, limit, total, totalPages });
});

