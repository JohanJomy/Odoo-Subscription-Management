import { listInvoices } from "@/server/payments";

export async function GET() {
  return Response.json({ data: listInvoices(), meta: { page: 1, limit: 100, total: listInvoices().length } });
}
