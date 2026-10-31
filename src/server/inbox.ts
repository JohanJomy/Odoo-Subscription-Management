import { prisma } from "@/lib/db";

export interface InboxTask {
  id: string;
  type: "RENEWAL_DUE" | "INVOICE_OVERDUE" | "DISCOUNT_EXPIRING" | "QUOTE_EXPIRING";
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  amount?: number;
  entityId: string;
  entityType: "subscription" | "invoice" | "discount";
  dueDate: string;
  actionLabel: string;
  actionUrl: string;
}

export interface InboxSummary {
  renewalsDueCount: number;
  overdueInvoicesCount: number;
  expiringDiscountsCount: number;
  expiringQuotesCount: number;
  totalTasks: number;
  tasks: InboxTask[];
}

export async function getInboxReport(): Promise<InboxSummary> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 1. Subscriptions expiring in 7 days (and active)
  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      expiryDate: {
        lte: in7Days,
      },
    },
    include: {
      customer: { select: { name: true } },
      plan: { select: { name: true, price: true } },
    },
    take: 20,
    orderBy: { expiryDate: "asc" },
  });

  // 2. Invoices overdue (CONFIRMED and dueDate < now and total > paidTotal)
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: "CONFIRMED",
      dueDate: {
        lt: now,
      },
    },
    include: {
      subscription: {
        include: {
          customer: { select: { name: true } },
        },
      },
    },
    take: 20,
    orderBy: { dueDate: "asc" },
  });

  // 3. Discounts ending in 7 days OR >= 90% used
  const expiringDiscounts = await prisma.discount.findMany({
    where: {
      active: true,
      OR: [
        { endDate: { lte: in7Days } },
        // Will filter 90% used in memory if needed
      ],
    },
    take: 20,
    orderBy: { endDate: "asc" },
  });

  // 4. Quotes expiring in 3 days (QUOTATION status)
  const expiringQuotes = await prisma.subscription.findMany({
    where: {
      status: "QUOTATION",
      quoteValidUntil: {
        lte: in3Days,
      },
    },
    include: {
      customer: { select: { name: true } },
      plan: { select: { name: true } },
    },
    take: 20,
    orderBy: { quoteValidUntil: "asc" },
  });

  const tasks: InboxTask[] = [];

  for (const inv of overdueInvoices) {
    const outstanding = inv.total - inv.paidTotal;
    if (outstanding > 0) {
      tasks.push({
        id: `inv-${inv.id}`,
        type: "INVOICE_OVERDUE",
        severity: "HIGH",
        title: `Overdue Invoice: ${inv.number}`,
        description: `${inv.subscription?.customer?.name || "Customer"} has an outstanding balance of ₹${(outstanding / 100).toFixed(2)}. Due on ${inv.dueDate.toISOString().slice(0, 10)}.`,
        amount: outstanding,
        entityId: inv.id,
        entityType: "invoice",
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        actionLabel: "Collect Payment",
        actionUrl: `/invoices`,
      });
    }
  }

  for (const sub of expiringSubscriptions) {
    tasks.push({
      id: `sub-${sub.id}`,
      type: "RENEWAL_DUE",
      severity: "MEDIUM",
      title: `Upcoming Renewal: ${sub.number}`,
      description: `${sub.customer.name} (${sub.plan.name}) renewal period ends on ${sub.expiryDate.toISOString().slice(0, 10)}.`,
      amount: sub.plan.price,
      entityId: sub.id,
      entityType: "subscription",
      dueDate: sub.expiryDate.toISOString().slice(0, 10),
      actionLabel: "View Subscription",
      actionUrl: `/subscriptions/${sub.id}`,
    });
  }

  for (const disc of expiringDiscounts) {
    tasks.push({
      id: `disc-${disc.id}`,
      type: "DISCOUNT_EXPIRING",
      severity: "LOW",
      title: `Promo Discount Ending: ${disc.name}`,
      description: `Discount validity concludes on ${disc.endDate.toISOString().slice(0, 10)}. (Used: ${disc.usedCount}/${disc.usageLimit})`,
      entityId: disc.id,
      entityType: "discount",
      dueDate: disc.endDate.toISOString().slice(0, 10),
      actionLabel: "Adjust Pricing",
      actionUrl: `/pricing/discounts`,
    });
  }

  for (const quote of expiringQuotes) {
    tasks.push({
      id: `quote-${quote.id}`,
      type: "QUOTE_EXPIRING",
      severity: "MEDIUM",
      title: `Quotation Expiring: ${quote.number}`,
      description: `Pending proposal for ${quote.customer.name} will expire on ${quote.quoteValidUntil?.toISOString().slice(0, 10) || "soon"}.`,
      entityId: quote.id,
      entityType: "subscription",
      dueDate: quote.quoteValidUntil?.toISOString().slice(0, 10) || "",
      actionLabel: "Follow Up",
      actionUrl: `/subscriptions/${quote.id}`,
    });
  }

  return {
    renewalsDueCount: expiringSubscriptions.length,
    overdueInvoicesCount: overdueInvoices.length,
    expiringDiscountsCount: expiringDiscounts.length,
    expiringQuotesCount: expiringQuotes.length,
    totalTasks: tasks.length,
    tasks,
  };
}

