import React from "react";
import { cn } from "@/lib/utils";

export type DisplayStatus =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "ACTIVE"
  | "PAID"
  | "OVERDUE"
  | "CLOSED"
  | "PAUSED"
  | "CANCELLED";

interface StatusChipProps {
  status: DisplayStatus | string;
  className?: string;
  label?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; lineThrough?: boolean }> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-700 border-slate-200", label: "Draft" },
  QUOTATION: { bg: "bg-blue-100", text: "text-blue-800 border-blue-200", label: "Quotation" },
  CONFIRMED: { bg: "bg-indigo-100", text: "text-indigo-800 border-indigo-200", label: "Confirmed" },
  ACTIVE: { bg: "bg-emerald-100", text: "text-emerald-800 border-emerald-200", label: "Active" },
  PAID: { bg: "bg-emerald-100", text: "text-emerald-800 border-emerald-200", label: "Paid" },
  OVERDUE: { bg: "bg-rose-100", text: "text-rose-800 border-rose-200", label: "Overdue" },
  CLOSED: { bg: "bg-slate-100", text: "text-slate-700 border-slate-200", label: "Closed" },
  PAUSED: { bg: "bg-amber-100", text: "text-amber-800 border-amber-200", label: "Paused" },
  CANCELLED: { bg: "bg-slate-100", text: "text-slate-500 line-through border-slate-200", label: "Cancelled", lineThrough: true },
};

export function StatusChip({ status, className, label }: StatusChipProps) {
  const normalized = (status || "").toUpperCase();
  const config = STATUS_STYLES[normalized] ?? {
    bg: "bg-slate-100",
    text: "text-slate-700 border-slate-200",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        className
      )}
    >
      {label ?? config.label}
    </span>
  );
}
