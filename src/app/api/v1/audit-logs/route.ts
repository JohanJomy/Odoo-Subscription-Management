import { listAuditLogs } from "@/server/audit";

export async function GET(request: Request) {
  const value = Number(new URL(request.url).searchParams.get("limit") || 100);
  const limit = Number.isInteger(value) ? Math.min(Math.max(value, 1), 200) : 100;
  return Response.json({ data: await listAuditLogs(limit), meta: { limit } });
}
