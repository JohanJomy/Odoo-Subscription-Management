import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/server/auth/guard';
import { CustomerDetailsClient } from './customer-details-client';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  // Security guard: Customers can ONLY see their own profile
  if (session.role === 'CUSTOMER' && session.customerId !== id) {
    notFound();
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    notFound();
  }

  // Fetch related subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: { customerId: id },
    include: {
      plan: {
        select: {
          name: true,
          billingPeriod: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch related invoices
  const invoices = await prisma.invoice.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch related payments through invoices
  const payments = await prisma.payment.findMany({
    where: {
      invoice: {
        customerId: id,
      },
    },
    include: {
      invoice: {
        select: {
          number: true,
        },
      },
    },
    orderBy: { paidOn: 'desc' },
  });

  // Compute exact health status based on overdue invoices:
  // "Red if any invoice is more than 30 days overdue, amber if any is overdue, otherwise green."
  const now = new Date();
  const overdueInvoices = invoices.filter(
    (inv) => inv.status === 'CONFIRMED' && inv.paidTotal < inv.total && inv.dueDate < now
  );

  let health: 'GOOD' | 'AMBER' | 'RED' = 'GOOD';
  if (overdueInvoices.length > 0) {
    const isSevere = overdueInvoices.some(
      (inv) => now.getTime() - new Date(inv.dueDate).getTime() > 30 * 24 * 60 * 60 * 1000
    );
    health = isSevere ? 'RED' : 'AMBER';
  }

  const serializedCustomer = {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
  };

  const serializedSubs = subscriptions.map((s) => ({
    ...s,
    startDate: s.startDate.toISOString(),
    expiryDate: s.expiryDate.toISOString(),
    nextInvoiceDate: s.nextInvoiceDate?.toISOString() ?? null,
    quoteValidUntil: s.quoteValidUntil?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  const serializedInvoices = invoices.map((inv) => ({
    ...inv,
    periodStart: inv.periodStart.toISOString(),
    periodEnd: inv.periodEnd.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    sentAt: inv.sentAt?.toISOString() ?? null,
  }));

  const serializedPayments = payments.map((p) => ({
    ...p,
    paidOn: p.paidOn.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }));

  const canEdit = session.role === 'ADMIN' || session.role === 'STAFF';

  return (
    <CustomerDetailsClient
      customer={serializedCustomer}
      health={health}
      subscriptions={serializedSubs}
      invoices={serializedInvoices}
      payments={serializedPayments}
      canEdit={canEdit}
    />
  );
}

