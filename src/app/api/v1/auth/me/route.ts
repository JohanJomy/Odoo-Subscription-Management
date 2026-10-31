import { apiHandler, ok } from "@/lib/http";
import { requireAuth } from "@/server/auth/guard";

export const GET = apiHandler(async (request: Request) => {
  const user = await requireAuth(request);

  return ok({
    id: user.id,
    email: user.email,
    role: user.role,
    customerId: user.customerId,
    name: user.name,
  });
});
