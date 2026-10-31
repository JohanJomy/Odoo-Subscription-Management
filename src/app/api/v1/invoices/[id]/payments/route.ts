import { recordPayment, type PaymentMethod } from "@/server/payments";
import { requireRole } from "@/server/auth/guard";
import { apiHandler } from "@/lib/http";

const methods = new Set<PaymentMethod>(["UPI", "BANK", "CARD", "CASH"]);

export const POST = apiHandler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
    await requireRole(["ADMIN", "STAFF"], request);
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const method = typeof body.method === "string" ? body.method.toUpperCase() as PaymentMethod : null;
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const paidOn = typeof body.paidOn === "string" ? body.paidOn : "";
    if (!method || !methods.has(method) || !Number.isInteger(amount) || typeof body.note === "string" && body.note.length > 200) {
      return Response.json({ error: { code: "VALIDATION_FAILED" } }, { status: 422 });
    }
    const externalRef = typeof body.externalRef === "string" ? body.externalRef : request.headers.get("Idempotency-Key") || undefined;
    const result = await recordPayment(id, { method, amount, paidOn, note: typeof body.note === "string" ? body.note : undefined, externalRef });
    return Response.json({ data: result }, { status: result.duplicate ? 200 : 201 });
});
