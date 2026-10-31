import { PaymentError, recordPayment, type PaymentMethod } from "@/server/payments";

const methods = new Set<PaymentMethod>(["UPI", "BANK", "CARD", "CASH"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const method = typeof body.method === "string" ? body.method.toUpperCase() as PaymentMethod : null;
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const paidOn = typeof body.paidOn === "string" ? body.paidOn : "";
    if (!method || !methods.has(method) || !Number.isInteger(amount) || typeof body.note === "string" && body.note.length > 200) {
      return Response.json({ error: { code: "VALIDATION_FAILED" } }, { status: 422 });
    }
    const result = recordPayment(id, { method, amount, paidOn, note: typeof body.note === "string" ? body.note : undefined, externalRef: typeof body.externalRef === "string" ? body.externalRef : undefined });
    return Response.json({ data: result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof PaymentError) return Response.json({ error: { code: error.code } }, { status: error.status });
    return Response.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }
}
