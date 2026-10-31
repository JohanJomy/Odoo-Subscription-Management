'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Building,
  Phone,
  MapPin,
  FileCheck2,
  Repeat,
  Receipt,
  CreditCard,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { StatusChip } from '@/components/shared/status-chip';

interface CustomerDetailsClientProps {
  customer: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    address: string | null;
    gstin: string | null;
    createdAt: string;
  };
  health: 'GOOD' | 'AMBER' | 'RED';
  subscriptions: Array<{
    id: string;
    number: string;
    status: string;
    closeReason: string | null;
    startDate: string;
    expiryDate: string;
    plan: {
      name: string;
      billingPeriod: string;
      price: number;
    };
  }>;
  invoices: Array<{
    id: string;
    number: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    total: number;
    paidTotal: number;
    dueDate: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidOn: string;
    note: string | null;
    invoice: {
      number: string;
    };
  }>;
  canEdit: boolean;
}

export function CustomerDetailsClient({
  customer: initialCustomer,
  health,
  subscriptions,
  invoices,
  payments,
  canEdit,
}: CustomerDetailsClientProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [activeTab, setActiveTab] = useState<'SUBSCRIPTIONS' | 'INVOICES' | 'PAYMENTS'>('SUBSCRIPTIONS');

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editCompany, setEditCompany] = useState(customer.company || '');
  const [editPhone, setEditPhone] = useState(customer.phone || '');
  const [editAddress, setEditAddress] = useState(customer.address || '');
  const [editGstin, setEditGstin] = useState(customer.gstin || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!editName.trim()) {
      setError('Customer name is required');
      setSaving(false);
      return;
    }
    if (editPhone.trim() && !/^\d{7,15}$/.test(editPhone.trim())) {
      setError('Phone must be 7 to 15 digits');
      setSaving(false);
      return;
    }
    if (
      editGstin.trim() &&
      !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(editGstin.trim())
    ) {
      setError('Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          company: editCompany.trim() || undefined,
          phone: editPhone.trim() || undefined,
          address: editAddress.trim() || undefined,
          gstin: editGstin.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setCustomer(json.data);
        setIsEditing(false);
        setSuccess('Customer profile updated successfully');
        router.refresh();
      } else {
        setError(json.error?.message || 'Failed to update customer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-2xs">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
                {health === 'GOOD' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Good Health
                  </span>
                ) : health === 'AMBER' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Overdue (&lt;30d)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Critical Overdue (&gt;30d)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer since {new Date(customer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditName(customer.name);
                setEditCompany(customer.company || '');
                setEditPhone(customer.phone || '');
                setEditAddress(customer.address || '');
                setEditGstin(customer.gstin || '');
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition self-start sm:self-auto"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="flex items-center gap-2 text-xs">
            <Building className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Company</span>
              <span className="font-semibold text-slate-800">{customer.company || 'Individual'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
              <span className="font-semibold text-slate-800">{customer.phone || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <FileCheck2 className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTIN</span>
              <span className="font-mono font-semibold text-slate-800">{customer.gstin || 'Unregistered'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
              <span className="font-medium text-slate-800 truncate block max-w-[180px]">
                {customer.address || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('SUBSCRIPTIONS')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'SUBSCRIPTIONS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Repeat className="h-4 w-4" />
          Subscriptions ({subscriptions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INVOICES')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'INVOICES'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Invoices ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'PAYMENTS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Payments ({payments.length})
        </button>
      </div>

      {/* Tab 1: Subscriptions */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Subscription #</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Cadence</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      No subscriptions found for this customer.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        <Link
                          href={`/subscriptions/${s.id}`}
                          className="hover:text-indigo-600 transition"
                        >
                          {s.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{s.plan.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.plan.billingPeriod}</td>
                      <td className="px-5 py-3.5">
                        <StatusChip status={s.status} />
                        {s.closeReason && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            ({s.closeReason})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(s.startDate).toLocaleDateString('en-IN')} →{' '}
                        {new Date(s.expiryDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/subscriptions/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Details <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Invoices */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Billing Period</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      No invoices found for this customer.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{inv.number}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(inv.periodStart).toLocaleDateString('en-IN')} →{' '}
                        {new Date(inv.periodEnd).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusChip status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-emerald-700">
                        {formatMoney(inv.paidTotal)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        {formatMoney(inv.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payments */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Note</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      No payments recorded yet for this customer.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        {new Date(p.paidOn).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {p.invoice.number}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">{p.note || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                        {formatMoney(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Customer Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="Optional business name"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Phone (7–15 digits)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Optional phone number"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Optional billing address"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">GSTIN</label>
                <input
                  type="text"
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

