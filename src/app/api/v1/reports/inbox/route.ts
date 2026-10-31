import { getInboxReport } from "@/server/inbox";
import { requireRole } from "@/server/auth/guard";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (request: Request) => {
  await requireRole(["ADMIN", "STAFF"], request);
  const inbox = await getInboxReport();
  return Response.json({ data: inbox });
});

