import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import {
  Users,
  Repeat,
  Receipt,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Database,
  CheckCircle2,
  Lock,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [customerCount, subscriptionCount, invoiceCount, paymentCount, recentAudits] =
    await Promise.all([
      prisma.customer.count(),
      prisma.subscription.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { at: "desc" },
      }),
    ]);

  // Aggregate total collected payments from seed
  const paymentsAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
  });
  const totalCollected = paymentsAgg._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Platform Overview</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            LoopLedger Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Brightloop Autonomous Subscription & Billing Platform · Ready for all modules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/team"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>Manage Team</span>
          </Link>
          <Link
            href="/audit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-indigo-700 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>View Audit Logs</span>
          </Link>
        </div>
      </div>

      {/* Primary Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Customers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">{customerCount}</div>
            <p className="text-[11px] text-slate-500 mt-1">Multi-tenant verified records</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Subscriptions
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {subscriptionCount}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Active lifecycle states
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Invoices</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">{invoiceCount}</div>
            <p className="text-[11px] text-slate-500 mt-1">Generated and ledger tracked</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Payments Collected
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatMoney(totalCollected)}
            </div>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">
              {paymentCount} verified payments
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: P1 Ready Modules & Live Audit Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P1 Platform Status Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                P1 Platform Foundation Status
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              ● Ready & Unblocking
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Prisma Schema & Migrations Frozen
                </p>
                <p className="text-[11px] text-slate-500">
                  15 relational models with strictly formatted paise integers & idempotent billing
                  unique keys.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3">
              <Lock className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Enterprise JWT Auth & Route Guard
                </p>
                <p className="text-[11px] text-slate-500">
                  Middleware protection, bcrypt password hashing, 30-min reset tokens, and
                  customer multi-tenant isolation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3">
              <GitBranch className="h-4 w-4 text-slate-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Team Branches Ready for Teammates
                </p>
                <p className="text-[11px] text-slate-500">
                  P2 (billing-engine), P3 (catalog-ui), and P4 (reports-portal) can rebase on
                  origin/p1/auth-api.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">P1 Owned Screens:</span>
            <div className="flex items-center gap-2">
              <Link
                href="/team"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                /team <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="text-slate-300">•</span>
              <Link
                href="/audit"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                /audit <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Live Recent Audit Log Activity */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">Recent Audit Trail</h2>
              </div>
              <Link
                href="/audit"
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                View all ({recentAudits.length})
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No audit events recorded yet. Perform actions to see entries appear here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentAudits.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {item.action}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        By {item.userId ?? "System"} on {item.entity} ({item.entityId})
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-slate-400">
                      {new Date(item.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tamper-evident audit logging active</span>
            <span className="font-mono text-[11px] text-emerald-600 font-medium">
              ● Recording all actions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
