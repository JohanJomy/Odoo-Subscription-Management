import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/server/auth/guard';
import { Users, Search, ChevronLeft, ChevronRight, Building, Phone, ArrowRight, ShieldAlert } from 'lucide-react';
import { CustomerCreateModal } from './customer-create-modal';

export const dynamic = 'force-dynamic';

function HealthBadge({ status }: { status: 'GOOD' | 'AMBER' | 'RED' }) {
  if (status === 'GOOD') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Healthy
      </span>
    );
  }
  if (status === 'AMBER') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Overdue (&lt;30d)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
      Critical (&gt;30d)
    </span>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'CUSTOMER') redirect('/dashboard');

  const sp = await searchParams;
  const q = sp.q?.trim() || '';
  const page = Math.max(1, parseInt(sp.page || '1', 10));
  const limit = 15;
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
          { phone: { contains: q } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { subscriptions: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  // Query invoices for health badge calculation
  const customerIds = customers.map((c) => c.id);
  const candidateInvoices = await prisma.invoice.findMany({
    where: {
      customerId: { in: customerIds },
      status: 'CONFIRMED',
    },
    select: {
      customerId: true,
      total: true,
      paidTotal: true,
      dueDate: true,
    },
  });

  const now = new Date();
  const healthMap = new Map<string, 'GOOD' | 'AMBER' | 'RED'>();

  for (const c of customers) {
    const custInvoices = candidateInvoices.filter(
      (inv) => inv.customerId === c.id && inv.paidTotal < inv.total && inv.dueDate < now
    );

    if (custInvoices.length === 0) {
      healthMap.set(c.id, 'GOOD');
    } else {
      const isSevere = custInvoices.some(
        (inv) => now.getTime() - new Date(inv.dueDate).getTime() > 30 * 24 * 60 * 60 * 1000
      );
      healthMap.set(c.id, isSevere ? 'RED' : 'AMBER');
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Core Operations</span>
            <span>•</span>
            <span className="text-indigo-600 font-semibold">CRM & Accounts</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer directories, view account health indicators, and inspect active subscription portfolios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CustomerCreateModal onSuccess={() => redirect('/customers')} />
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form method="GET" action="/customers" className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, company, or phone..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{customers.length}</strong> of{' '}
            <strong className="text-slate-800">{total}</strong> accounts
          </span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">GSTIN</th>
                <th className="px-5 py-3">Health Status</th>
                <th className="px-5 py-3 text-center">Subscriptions</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Users className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No customers found</p>
                    <p className="text-xs mt-1">
                      {q ? `No matches for "${q}". Try clearing the search filter.` : 'Get started by creating your first customer account.'}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const health = healthMap.get(c.id) || 'GOOD';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 block"
                        >
                          {c.name}
                        </Link>
                        {c.company && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3" />
                            {c.company}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {c.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {c.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                        {c.gstin || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <HealthBadge status={health} />
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-800">
                        {c._count.subscriptions}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/customers?page=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 ${
                  page <= 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Link>
              <Link
                href={`/customers?page=${Math.min(totalPages, page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 ${
                  page >= totalPages ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

