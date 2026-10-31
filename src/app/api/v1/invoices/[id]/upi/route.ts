import { getUpiRequest } from "@/server/upi";
import { requireAuth } from "@/server/auth/guard";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(_request);
    const { id } = await context.params;
    const request = await getUpiRequest(id, user.role === "CUSTOMER" ? user.customerId : undefined);
    return Response.json({ data: request });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_NOT_PAYABLE") {
      return Response.json({ error: { code: error.message } }, { status: 409 });
    }
    return Response.json({ error: { code: "INVOICE_NOT_FOUND" } }, { status: 404 });
  }
}
