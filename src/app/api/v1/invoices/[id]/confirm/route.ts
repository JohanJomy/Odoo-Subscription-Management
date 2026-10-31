import { PaymentError, transitionInvoice } from "@/server/payments";
import { requireRole } from "@/server/auth/guard";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN", "STAFF"], _request);
    const { id } = await context.params;
    return Response.json({ data: await transitionInvoice(id, "CONFIRMED") });
  } catch (error) {
    if (error instanceof PaymentError) return Response.json({ error: { code: error.code } }, { status: error.status });
    return Response.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
