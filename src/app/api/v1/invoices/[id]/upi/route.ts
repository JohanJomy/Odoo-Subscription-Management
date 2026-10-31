import { getUpiRequest } from "@/server/upi";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json({ data: await getUpiRequest(id) });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_NOT_PAYABLE") {
      return Response.json({ error: { code: error.message } }, { status: 409 });
    }
    return Response.json({ error: { code: "INVOICE_NOT_FOUND" } }, { status: 404 });
  }
}
