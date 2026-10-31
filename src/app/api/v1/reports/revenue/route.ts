import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guard";
import { apiHandler, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function calcGrowth(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export const GET = apiHandler(async (request: NextRequest) => {
  await requireRole(["ADMIN", "STAFF"], request);

  const sp = request.nextUrl.searchParams;
  const fromParam = sp.get("from");
  const toParam = sp.get("to");

  const whereClause: {
    status: { not: "CANCELLED" };
    periodStart?: { gte?: Date; lte?: Date };
  } = {
    status: { not: "CANCELLED" },
  };

  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  if (fromParam || toParam) {
    whereClause.periodStart = {};
    if (fromParam) {
      fromDate = new Date(fromParam);
      whereClause.periodStart.gte = fromDate;
    }
    if (toParam) {
      toDate = new Date(`${toParam}T23:59:59.999Z`);
      whereClause.periodStart.lte = toDate;
    }
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    orderBy: { periodStart: "asc" },
  });

  const invoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const collected = invoices.reduce((sum, inv) => sum + inv.paidTotal, 0);
  const outstanding = Math.max(0, invoiced - collected);
  const collectionRate = invoiced === 0 ? 0 : Number(((collected / invoiced) * 100).toFixed(2));
  const paidCount = invoices.filter((inv) => inv.status === "PAID").length;

  // Monthly grouping for time series line chart
  const monthlyMap = new Map<string, { month: string; invoiced: number; collected: number; outstanding: number; count: number }>();

  for (const inv of invoices) {
    const monthKey = inv.periodStart.toISOString().slice(0, 7); // YYYY-MM
    const existing = monthlyMap.get(monthKey) || {
      month: monthKey,
      invoiced: 0,
      collected: 0,
      outstanding: 0,
      count: 0,
    };
    existing.invoiced += inv.total;
    existing.collected += inv.paidTotal;
    existing.outstanding += Math.max(0, inv.total - inv.paidTotal);
    existing.count += 1;
    monthlyMap.set(monthKey, existing);
  }

  const monthlySeries = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // Compute previous period comparison
  let prevInvoiced = 0;
  let prevCollected = 0;
  let prevOutstanding = 0;

  if (fromDate && toDate) {
    const duration = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - duration);
    const prevTo = new Date(fromDate.getTime() - 1);

    const prevInvoices = await prisma.invoice.findMany({
      where: {
        status: { not: "CANCELLED" },
        periodStart: { gte: prevFrom, lte: prevTo },
      },
    });

    prevInvoiced = prevInvoices.reduce((sum, inv) => sum + inv.total, 0);
    prevCollected = prevInvoices.reduce((sum, inv) => sum + inv.paidTotal, 0);
    prevOutstanding = Math.max(0, prevInvoiced - prevCollected);
  } else if (monthlySeries.length >= 2) {
    // If all time, compare latest month with previous month in the series
    const priorMonth = monthlySeries[monthlySeries.length - 2];
    prevInvoiced = priorMonth.invoiced;
    prevCollected = priorMonth.collected;
    prevOutstanding = priorMonth.outstanding;
  }

  const invoicedGrowth = calcGrowth(invoiced, prevInvoiced);
  const collectedGrowth = calcGrowth(collected, prevCollected);
  const outstandingGrowth = calcGrowth(outstanding, prevOutstanding);
  const prevCollectionRate = prevInvoiced === 0 ? 0 : Number(((prevCollected / prevInvoiced) * 100).toFixed(2));
  const collectionRateDiff = Number((collectionRate - prevCollectionRate).toFixed(2));

  return ok({
    asOf: new Date().toISOString().slice(0, 10),
    currency: "INR",
    filter: {
      from: fromParam || null,
      to: toParam || null,
    },
    totals: {
      invoiced,
      collected,
      outstanding,
    },
    previousPeriod: {
      invoiced: prevInvoiced,
      collected: prevCollected,
      outstanding: prevOutstanding,
      collectionRate: prevCollectionRate,
    },
    growth: {
      invoicedPercent: invoicedGrowth,
      collectedPercent: collectedGrowth,
      outstandingPercent: outstandingGrowth,
      collectionRateDiff,
    },
    collectionRate,
    invoiceCount: invoices.length,
    paidInvoiceCount: paidCount,
    monthly: monthlySeries,
  });
});
