import { revenueReport } from "@/server/reports";

export async function GET() {
  return Response.json({ data: await revenueReport() });
}
