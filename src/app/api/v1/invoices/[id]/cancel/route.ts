import { PaymentError, transitionInvoice } from "@/server/payments";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json({ data: await transitionInvoice(id, "CANCELLED") });
  } catch (error) {
    if (error instanceof PaymentError) return Response.json({ error: { code: error.code } }, { status: error.status });
    return Response.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
