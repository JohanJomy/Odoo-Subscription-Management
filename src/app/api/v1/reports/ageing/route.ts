import { ageingReport } from "@/server/reports";

export async function GET() {
  return Response.json({ data: await ageingReport() });
}
