import { getInvoice } from "@/server/payments";
import { requireAuth } from "@/server/auth/guard";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(_request);
    const { id } = await context.params;
    return Response.json({ data: await getInvoice(id, user.role === "CUSTOMER" ? user.customerId : undefined) });
  } catch (error) {
    return error instanceof Error && "status" in error
      ? Response.json({ error: { code: error.message } }, { status: (error as { status: number }).status })
      : Response.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
