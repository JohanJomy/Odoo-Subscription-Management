import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guard";
import { apiHandler, ok } from "@/lib/http";
import { ageingReport } from "@/server/reports";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireRole(["ADMIN", "STAFF"], request);

  const ageing = await ageingReport();

  // Format into 0-30, 31-60, 60+ days chart buckets
  const b = ageing.buckets;
  const zeroToThirtyAmount = (b.current?.amount || 0) + (b["1-30"]?.amount || 0);
  const zeroToThirtyCount = (b.current?.count || 0) + (b["1-30"]?.count || 0);
  const thirtyOneToSixtyAmount = b["31-60"]?.amount || 0;
  const thirtyOneToSixtyCount = b["31-60"]?.count || 0;
  const sixtyPlusAmount = b["61+"]?.amount || 0;
  const sixtyPlusCount = b["61+"]?.count || 0;

  const chartBuckets = [
    {
      bucket: "0–30 Days",
      amount: zeroToThirtyAmount,
      count: zeroToThirtyCount,
      color: "#10b981", // green/normal
    },
    {
      bucket: "31–60 Days",
      amount: thirtyOneToSixtyAmount,
      count: thirtyOneToSixtyCount,
      color: "#f59e0b", // amber/warning
    },
    {
      bucket: "60+ Days",
      amount: sixtyPlusAmount,
      count: sixtyPlusCount,
      color: "#ef4444", // red/critical
    },
  ];

  return ok({
    asOf: ageing.asOf,
    currency: ageing.currency,
    totalOutstanding: ageing.totalOutstanding,
    rawBuckets: ageing.buckets,
    chartBuckets,
  });
});

