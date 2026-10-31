import { revenueReport } from "@/server/reports";
import { requireRole } from "@/server/auth/guard";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (request: Request) => {
  await requireRole(["ADMIN", "STAFF"], request);
  return Response.json({ data: await revenueReport() });
});
