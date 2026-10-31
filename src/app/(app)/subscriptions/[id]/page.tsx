import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession, scopeToCustomer } from '@/server/auth/guard';
import { SubscriptionDetailsClient } from './subscription-details-client';

export const dynamic = 'force-dynamic';

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const scope = scopeToCustomer(session as Parameters<typeof scopeToCustomer>[0]);

  const sub = await prisma.subscription.findUnique({
    where: {
      id,
      ...scope,
    },
    include: {
      customer: { select: { id: true, name: true, company: true, phone: true } },
      plan: true,
      lines: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          total: true,
          paidTotal: true,
          dueDate: true,
        },
      },
    },
  });

  if (!sub) {
    notFound();
  }

  const audit = await prisma.auditLog.findMany({
    where: { entity: 'Subscription', entityId: id },
    orderBy: { at: 'desc' },
    take: 50,
  });

  const serializedSub = {
    ...sub,
    startDate: sub.startDate.toISOString(),
    expiryDate: sub.expiryDate.toISOString(),
    nextInvoiceDate: sub.nextInvoiceDate?.toISOString() ?? null,
    quoteValidUntil: sub.quoteValidUntil?.toISOString() ?? null,
    createdAt: sub.createdAt.toISOString(),
    invoices: sub.invoices.map((inv) => ({
      ...inv,
      periodStart: inv.periodStart.toISOString(),
      periodEnd: inv.periodEnd.toISOString(),
      dueDate: inv.dueDate.toISOString(),
    })),
    audit: audit.map((a) => ({
      ...a,
      at: a.at.toISOString(),
    })),
  };

  return (
    <SubscriptionDetailsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscription={serializedSub as any}
      currentUserRole={session.role}
    />
  );
}
