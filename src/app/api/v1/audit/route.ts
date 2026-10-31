import { Prisma } from "@prisma/client";

import { apiHandler, ok, parsePagination } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/guard";

export const GET = apiHandler(async (request: Request) => {
  await requireRole(["ADMIN"], request);

  const { page, limit, skip, searchParams } = parsePagination(request.url);
  const entity = searchParams.get("entity");
  const entityId = searchParams.get("entityId");
  const action = searchParams.get("action");

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity } : {}),
    ...(entityId ? { entityId } : {}),
    ...(action ? { action } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { at: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return ok(logs, { page, limit, total, totalPages });
});
