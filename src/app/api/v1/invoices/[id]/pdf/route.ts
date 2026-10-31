import { getInvoicePdf } from "@/server/invoice-pdf";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { invoice, bytes } = await getInvoicePdf(id);
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return Response.json({ error: { code: error.message } }, { status: (error as { status: number }).status });
    }
    return Response.json({ error: { code: "PDF_GENERATION_FAILED" } }, { status: 500 });
  }
}
