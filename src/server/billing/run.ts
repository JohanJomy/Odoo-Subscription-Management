import { PrismaClient } from '@prisma/client';
import {
  priceSubscription,
  addPeriod,
  PricingLineInput,
  DiscountCandidate,
} from './pricing';
import { nextNumber } from '@/lib/number-generator';
import { BillingPeriod, PaymentTerm } from '@/lib/constants';

export class RollbackForPreview extends Error {
  previewItems: RunItem[];
  constructor(items: RunItem[]) {
    super('Rollback for dry run preview');
    this.name = 'RollbackForPreview';
    this.previewItems = items;
  }
}

export interface RunItem {
  subscriptionId: string;
  subscriptionNumber?: string;
  customerName?: string;
  periodStart?: Date;
  periodEnd?: Date;
  outcome: 'CREATED' | 'SKIPPED_EXISTS' | 'FAILED';
  invoiceNumber?: string;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  total?: number; // paise
  message?: string;
}

export interface BillingRunSummary {
  created: number;
  skipped: number;
  failed: number;
  totalAmount: number; // paise
  items: RunItem[];
}

function endOfDay(d: Date): Date {
  const date = new Date(d.getTime());
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Runs pre-billing housekeeping:
 *  1. Activates CONFIRMED subscriptions whose startDate has arrived
 *  2. Closes expired QUOTATIONS whose quoteValidUntil has passed
 *  3. Closes expired ACTIVE subscriptions whose expiryDate has passed
 */
export async function runHousekeeping(prisma: PrismaClient, today: Date) {
  const eod = endOfDay(today);

  // 1. Activate CONFIRMED subscriptions whose startDate <= today
  const confirmedDue = await prisma.subscription.findMany({
    where: {
      status: 'CONFIRMED',
      startDate: { lte: eod },
    },
  });

  for (const sub of confirmedDue) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        nextInvoiceDate: sub.startDate,
      },
    });
    await prisma.auditLog.create({
      data: {
        entity: 'Subscription',
        entityId: sub.id,
        action: 'AUTO_ACTIVATE',
        detail: `Auto-activated subscription on start date ${sub.startDate.toISOString()}`,
      },
    });
  }

  // 2. Expire old quotations
  const expiredQuotes = await prisma.subscription.findMany({
    where: {
      status: 'QUOTATION',
      quoteValidUntil: { lt: today },
    },
  });

  for (const quote of expiredQuotes) {
    await prisma.subscription.update({
      where: { id: quote.id },
      data: {
        status: 'CLOSED',
        closeReason: 'EXPIRED',
      },
    });
    await prisma.auditLog.create({
      data: {
        entity: 'Subscription',
        entityId: quote.id,
        action: 'AUTO_EXPIRE_QUOTE',
        detail: `Quotation expired on ${quote.quoteValidUntil?.toISOString()}`,
      },
    });
  }

  // 3. Expire active subscriptions past expiryDate or past plan.endDate (if autoClose)
  const expiredActive = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { expiryDate: { lt: today } },
        {
          plan: {
            autoClose: true,
            endDate: { lt: today },
          },
        },
      ],
    },
    include: { plan: true },
  });

  for (const sub of expiredActive) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'CLOSED',
        closeReason: 'EXPIRED',
        nextInvoiceDate: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        entity: 'Subscription',
        entityId: sub.id,
        action: 'AUTO_EXPIRE_SUB',
        detail: `Subscription expired`,
      },
    });
  }
}

/**
 * Executes or previews a recurring billing run.
 * Guarantees zero duplicate billing via compound unique [subscriptionId, periodStart].
 * Supports catch-up loops for missed periods.
 */
export async function runBilling(
  prisma: PrismaClient,
  today: Date = new Date(),
  userId?: string,
  dryRun = false
): Promise<BillingRunSummary> {
  // First run automated housekeeping
  if (!dryRun) {
    await runHousekeeping(prisma, today);
  }

  const eod = endOfDay(today);

  // Retrieve active subscriptions due on or before today
  const due = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      nextInvoiceDate: { lte: eod },
    },
    include: {
      lines: true,
      plan: true,
      customer: true,
    },
  });

  const discounts = await prisma.discount.findMany({
    where: { active: true },
  });

  const taxes = await prisma.tax.findMany({
    where: { active: true },
  });
  const taxMap = new Map(taxes.map((t) => [t.id, t.ratePercent]));

  const report: RunItem[] = [];
  const previewItems: RunItem[] = [];

  for (const sub of due) {
    try {
      await prisma.$transaction(async (tx) => {
        let currentNextDate = new Date(sub.nextInvoiceDate!.getTime());

        // Catch-up loop: generate one invoice per missed cycle
        while (currentNextDate <= eod && currentNextDate <= sub.expiryDate) {
          const periodStart = new Date(currentNextDate.getTime());
          const periodEnd = addPeriod(periodStart, sub.plan.billingPeriod as BillingPeriod);

          // Unique key check
          const exists = await tx.invoice.findUnique({
            where: {
              subscriptionId_periodStart: {
                subscriptionId: sub.id,
                periodStart,
              },
            },
          });

          if (!exists) {
            // Build lines for pricing
            const lineInputs: PricingLineInput[] = sub.lines.map((l) => ({
              productId: l.productId,
              productName: l.description,
              variantId: l.variantId,
              salesPrice: l.unitPrice,
              qty: l.qty,
              taxId: l.taxId,
              taxRatePercent: l.taxId ? taxMap.get(l.taxId) ?? 0 : 0,
            }));

            // Transform discounts
            const discountCandidates: DiscountCandidate[] = discounts.map((d) => ({
              id: d.id,
              name: d.name,
              type: d.type as 'FIXED' | 'PERCENT',
              fixedAmount: d.fixedAmount,
              percent: d.percent,
              minPurchase: d.minPurchase,
              minQty: d.minQty,
              startDate: d.startDate,
              endDate: d.endDate,
              usageLimit: d.usageLimit,
              usedCount: d.usedCount,
              appliesTo: d.appliesTo as 'PRODUCT' | 'SUBSCRIPTION',
              productId: d.productId,
              subscriptionId: d.subscriptionId,
              active: d.active,
            }));

            const calc = priceSubscription({
              plan: {
                id: sub.plan.id,
                name: sub.plan.name,
                price: sub.plan.price,
                billingPeriod: sub.plan.billingPeriod as BillingPeriod,
              },
              lines: lineInputs,
              discounts: discountCandidates,
              defaultTaxRatePercent: 18,
              subscriptionId: sub.id,
              invoiceDate: periodStart,
              paymentTerm: sub.paymentTerm as PaymentTerm,
            });

            if (dryRun) {
              previewItems.push({
                subscriptionId: sub.id,
                subscriptionNumber: sub.number,
                customerName: sub.customer.name,
                periodStart,
                periodEnd,
                outcome: 'CREATED',
                subtotal: calc.subtotal,
                discountTotal: calc.discountTotal,
                taxTotal: calc.taxTotal,
                total: calc.total,
              });
            } else {
              const invoiceNumber = await nextNumber(tx, 'INV');

              // Create invoice record in DRAFT
              await tx.invoice.create({
                data: {
                  number: invoiceNumber,
                  subscriptionId: sub.id,
                  customerId: sub.customerId,
                  periodStart,
                  periodEnd,
                  status: 'DRAFT',
                  subtotal: calc.subtotal,
                  discountTotal: calc.discountTotal,
                  taxTotal: calc.taxTotal,
                  total: calc.total,
                  paidTotal: 0,
                  dueDate: calc.dueDate,
                  lines: {
                    create: calc.lines.map((line) => ({
                      description: line.description,
                      qty: line.qty,
                      unitPrice: line.unitPrice,
                      discountAmount: line.discountAmount,
                      taxAmount: line.taxAmount,
                      amount: line.taxableAmount,
                    })),
                  },
                },
              });

              // Atomically increment discount usage if applied
              if (calc.appliedDiscount) {
                await tx.discount.updateMany({
                  where: {
                    id: calc.appliedDiscount.id,
                    usedCount: { lt: discounts.find((d) => d.id === calc.appliedDiscount?.id)?.usageLimit ?? 999999 },
                  },
                  data: {
                    usedCount: { increment: 1 },
                  },
                });
              }

              report.push({
                subscriptionId: sub.id,
                subscriptionNumber: sub.number,
                customerName: sub.customer.name,
                periodStart,
                periodEnd,
                outcome: 'CREATED',
                invoiceNumber,
                subtotal: calc.subtotal,
                discountTotal: calc.discountTotal,
                taxTotal: calc.taxTotal,
                total: calc.total,
              });
            }
          } else {
            const skipItem: RunItem = {
              subscriptionId: sub.id,
              subscriptionNumber: sub.number,
              customerName: sub.customer.name,
              periodStart,
              periodEnd,
              outcome: 'SKIPPED_EXISTS',
              message: 'Invoice already exists for this billing period',
            };
            if (dryRun) {
              previewItems.push(skipItem);
            } else {
              report.push(skipItem);
            }
          }

          currentNextDate = periodEnd;
        }

        const isExpired = currentNextDate > sub.expiryDate;
        if (!dryRun) {
          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              nextInvoiceDate: isExpired ? null : currentNextDate,
              status: isExpired ? 'CLOSED' : 'ACTIVE',
              closeReason: isExpired ? 'EXPIRED' : sub.closeReason,
            },
          });
        } else {
          // Throw to rollback preview calculations
          throw new RollbackForPreview(previewItems);
        }
      });
    } catch (err) {
      if (err instanceof RollbackForPreview) {
        // Expected rollback in dry-run
        report.push(...err.previewItems);
      } else {
        // Isolated failure for this single subscription
        console.error(`Billing failed for subscription ${sub.id}:`, err);
        report.push({
          subscriptionId: sub.id,
          subscriptionNumber: sub.number,
          customerName: sub.customer.name,
          outcome: 'FAILED',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Calculate summary totals
  const created = report.filter((r) => r.outcome === 'CREATED').length;
  const skipped = report.filter((r) => r.outcome === 'SKIPPED_EXISTS').length;
  const failed = report.filter((r) => r.outcome === 'FAILED').length;
  const totalAmount = report
    .filter((r) => r.outcome === 'CREATED')
    .reduce((sum, r) => sum + (r.total || 0), 0);

  // If not dry-run, persist the run log
  if (!dryRun) {
    await prisma.billingRun.create({
      data: {
        ranById: userId,
        created,
        skipped,
        failed,
        report: JSON.stringify(report),
      },
    });
  }

  return {
    created,
    skipped,
    failed,
    totalAmount,
    items: report,
  };
}

/**
 * Preview billing without writing to the database
 */
export async function previewBilling(prisma: PrismaClient, today: Date = new Date()) {
  return runBilling(prisma, today, undefined, true);
}

