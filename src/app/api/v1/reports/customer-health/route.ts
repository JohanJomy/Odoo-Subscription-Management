import { customerHealthReport } from "@/server/reports";

export async function GET() {
  return Response.json({ data: await customerHealthReport() });
}
