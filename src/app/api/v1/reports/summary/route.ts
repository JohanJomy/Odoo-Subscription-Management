import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/guard";
import { apiHandler, ok } from "@/lib/http";
import { revenueReport } from "@/server/reports";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireRole(["ADMIN", "STAFF"], request);

  // 1. Fetch active subscriptions to calculate MRR and ARR
  const [activeSubs, totalSubs, allSubsGrouped, totalCustomers, revReport, recentPayments, recentInvoices] =
    await Promise.all([
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: {
          plan: { select: { price: true, billingPeriod: true } },
          lines: { select: { amount: true } },
        },
      }),
      prisma.subscription.count(),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.customer.count(),
      revenueReport(),
      prisma.payment.findMany({
        take: 6,
        orderBy: { paidOn: "desc" },
        include: {
          invoice: {
            select: {
              number: true,
              customerId: true,
            },
          },
        },
      }),
      prisma.invoice.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          customerId: true,
          total: true,
          paidTotal: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
      }),
    ]);

  // Calculate MRR
  let mrr = 0;
  for (const sub of activeSubs) {
    const linesTotal = sub.lines.reduce((acc, l) => acc + l.amount, 0);
    const subTotal = sub.plan.price + linesTotal;
    const monthlyVal = sub.plan.billingPeriod === "YEARLY" ? Math.round(subTotal / 12) : subTotal;
    mrr += monthlyVal;
  }
  const arr = mrr * 12;

  // Format subscription distribution
  const statusCounts: Record<string, number> = {};
  for (const g of allSubsGrouped) {
    statusCounts[g.status] = g._count.id;
  }

  const subscriptionDistribution = [
    { status: "ACTIVE", name: "Active", count: statusCounts["ACTIVE"] || 0, color: "#10b981" },
    { status: "CONFIRMED", name: "Confirmed", count: statusCounts["CONFIRMED"] || 0, color: "#6366f1" },
    { status: "QUOTATION", name: "Quotation", count: statusCounts["QUOTATION"] || 0, color: "#f59e0b" },
    { status: "DRAFT", name: "Draft", count: statusCounts["DRAFT"] || 0, color: "#94a3b8" },
    { status: "CLOSED", name: "Closed", count: statusCounts["CLOSED"] || 0, color: "#ef4444" },
  ];

  return ok({
    mrr,
    arr,
    activeSubscriptions: activeSubs.length,
    totalSubscriptions: totalSubs,
    totalCustomers,
    revenueTotals: revReport.totals,
    collectionRate: revReport.collectionRate,
    subscriptionDistribution,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      paidOn: p.paidOn.toISOString(),
      invoiceNumber: p.invoice.number,
      customerId: p.invoice.customerId,
    })),
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      customerId: inv.customerId,
      total: inv.total,
      paidTotal: inv.paidTotal,
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    })),
  });
});

