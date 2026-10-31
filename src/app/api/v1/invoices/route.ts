import { listInvoices } from "@/server/payments";

export async function GET() {
  const data = await listInvoices();
  return Response.json({ data, meta: { page: 1, limit: 100, total: data.length } });
}
