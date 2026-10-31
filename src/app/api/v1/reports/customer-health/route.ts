import { NextRequest } from "next/server";
import { customerHealthReport } from "@/server/reports";
import { requireRole } from "@/server/auth/guard";
import { apiHandler, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireRole(["ADMIN", "STAFF"], request);
  const data = await customerHealthReport();
  return ok(data);
});
