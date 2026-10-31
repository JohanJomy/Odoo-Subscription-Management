import { listInvoices } from "@/server/payments";
import { requireAuth } from "@/server/auth/guard";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (request: Request) => {
  const user = await requireAuth(request);
  const data = await listInvoices(user.role === "CUSTOMER" ? user.customerId : undefined);
  return Response.json({ data, meta: { page: 1, limit: 100, total: data.length } });
});
