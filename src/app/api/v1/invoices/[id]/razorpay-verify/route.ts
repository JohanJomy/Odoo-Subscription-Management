import { apiHandler, fail } from "@/lib/http";
import { requireAuth } from "@/server/auth/guard";
import { recordPayment } from "@/server/payments";
import { verifyRazorpayPayment } from "@/server/razorpay";

export const POST = apiHandler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(request);
  const { id } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!orderId || !paymentId || !signature) return fail(422, "VALIDATION_FAILED", "Razorpay payment details are required");
  try {
    const verified = await verifyRazorpayPayment({
      invoiceId: id,
      orderId,
      paymentId,
      signature,
      customerId: user.role === "CUSTOMER" ? user.customerId : undefined,
    });
    const result = await recordPayment(id, {
      method: "UPI",
      amount: verified.payment.amount,
      paidOn: new Date().toISOString().slice(0, 10),
      externalRef: paymentId,
      note: `Razorpay order ${orderId}`,
    });
    return Response.json({ data: result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "RAZORPAY_SIGNATURE_INVALID") return fail(400, error.message, "Razorpay signature verification failed");
    if (error instanceof Error && error.message === "RAZORPAY_PAYMENT_INVALID") return fail(400, error.message, "Razorpay payment does not match this invoice");
    if (error instanceof Error && error.message === "RAZORPAY_NOT_CONFIGURED") return fail(503, error.message, "Razorpay test credentials are not configured");
    throw error;
  }
});
