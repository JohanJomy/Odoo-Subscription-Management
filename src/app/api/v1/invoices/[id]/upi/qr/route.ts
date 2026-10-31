import QRCode from "qrcode";

import { requireAuth } from "@/server/auth/guard";
import { getUpiRequest } from "@/server/upi";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const payment = await getUpiRequest(id, user.role === "CUSTOMER" ? user.customerId : undefined);
    const png = await QRCode.toBuffer(payment.uri, { type: "png", width: 420, margin: 2, errorCorrectionLevel: "M" });
    return new Response(png as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${payment.invoiceNumber}-upi.png"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_NOT_PAYABLE") {
      return Response.json({ error: { code: error.message } }, { status: 409 });
    }
    return Response.json({ error: { code: "INVOICE_NOT_FOUND" } }, { status: 404 });
  }
}
