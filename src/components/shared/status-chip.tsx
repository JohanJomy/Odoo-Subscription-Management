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
  showDot?: boolean;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string; lineThrough?: boolean }
> = {
  ACTIVE: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    label: "Active",
  },
  PAID: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    label: "Paid",
  },
  CONFIRMED: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
    label: "Confirmed",
  },
  QUOTATION: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    label: "Quotation",
  },
  OVERDUE: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    label: "Overdue",
  },
  PAUSED: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    label: "Paused",
  },
  DRAFT: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
    label: "Draft",
  },
  CLOSED: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
    label: "Closed",
  },
  CANCELLED: {
    bg: "bg-slate-100",
    text: "text-slate-500",
    border: "border-slate-200",
    dot: "bg-slate-400",
    label: "Cancelled",
    lineThrough: true,
  },
};

export function StatusChip({ status, className, label, showDot = true }: StatusChipProps) {
  const normalized = (status || "").toUpperCase();
  const config = STATUS_STYLES[normalized] ?? {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors",
        config.bg,
        config.text,
        config.border,
        config.lineThrough ? "line-through" : "",
        className
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)}
          aria-hidden="true"
        />
      )}
      <span>{label ?? config.label}</span>
    </span>
  );
}
