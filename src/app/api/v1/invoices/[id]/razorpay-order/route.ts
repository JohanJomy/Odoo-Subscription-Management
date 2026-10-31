import { apiHandler, fail } from "@/lib/http";
import { requireAuth } from "@/server/auth/guard";
import { createRazorpayOrder } from "@/server/razorpay";

export const POST = apiHandler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(request);
  const { id } = await context.params;
  try {
    return Response.json({
      data: await createRazorpayOrder(id, user.role === "CUSTOMER" ? user.customerId : undefined),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_NOT_PAYABLE") {
      return fail(409, error.message, "Invoice has no outstanding balance");
    }
    if (error instanceof Error && error.message === "RAZORPAY_NOT_CONFIGURED") {
      return fail(503, error.message, "Razorpay test credentials are not configured");
    }
    throw error;
  }
});
