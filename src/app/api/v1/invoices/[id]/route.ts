import { getInvoice } from "@/server/payments";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json({ data: await getInvoice(id) });
  } catch (error) {
    return error instanceof Error && "status" in error
      ? Response.json({ error: { code: error.message } }, { status: (error as { status: number }).status })
      : Response.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
