'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, User, Building, Phone, MapPin, FileCheck2, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  company: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{7,15}$/.test(val), {
      message: 'Phone must contain 7 to 15 digits',
    }),
  address: z.string().optional(),
  gstin: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(val), {
      message: 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)',
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomerCreateModalProps {
  onSuccess?: () => void;
}

export function CustomerCreateModal({ onSuccess }: CustomerCreateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      company: '',
      phone: '',
      address: '',
      gstin: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      const payload = {
        name: values.name.trim(),
        company: values.company?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        gstin: values.gstin?.trim() || undefined,
      };

      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error?.message || 'Failed to create customer');
        return;
      }

      reset();
      setOpen(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Network error');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs transition"
      >
        <Plus className="h-4 w-4" />
        Add Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {apiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    {...register('name')}
                    placeholder="Acme Corp or Jane Doe"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    {...register('company')}
                    placeholder="Optional business entity name"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {errors.company && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.company.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Phone (7–15 digits)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    {...register('phone')}
                    placeholder="e.g. 9876543210"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    {...register('address')}
                    placeholder="Billing street & city"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  GSTIN (Indian Tax ID)
                </label>
                <div className="relative">
                  <FileCheck2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    {...register('gstin')}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
                  />
                </div>
                {errors.gstin && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.gstin.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

