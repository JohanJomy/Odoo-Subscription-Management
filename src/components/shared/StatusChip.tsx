"use client";

import React from "react";

export type StatusVariant =
  | "active"
  | "inactive"
  | "draft"
  | "pending"
  | "paused"
  | "closed"
  | "expired"
  | "cancelled"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default";

export interface StatusChipProps {
  status: string;
  variant?: StatusVariant;
  label?: string;
  size?: "sm" | "md" | "lg";
  withDot?: boolean;
  className?: string;
}

const variantStyles: Record<
  StatusVariant,
  { bg: string; text: string; dot: string; border: string }
> = {
  active: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  inactive: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-600 dark:text-neutral-400",
    dot: "bg-neutral-400",
    border: "border-neutral-200 dark:border-neutral-700",
  },
  draft: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800",
  },
  paused: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    border: "border-orange-200 dark:border-orange-800",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800",
  },
  closed: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-800",
  },
  expired: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-500 dark:text-neutral-400",
    dot: "bg-neutral-400",
    border: "border-neutral-200 dark:border-neutral-700",
  },
  cancelled: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-800",
  },
  danger: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-800",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-800",
  },
  default: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    dot: "bg-neutral-400",
    border: "border-neutral-200 dark:border-neutral-700",
  },
};

export function StatusChip({
  status,
  variant,
  label,
  size = "md",
  withDot = true,
  className = "",
}: StatusChipProps) {
  // Infer variant if not explicitly provided
  const resolvedVariant: StatusVariant =
    variant ||
    (status.toLowerCase() in variantStyles
      ? (status.toLowerCase() as StatusVariant)
      : "default");

  const styles = variantStyles[resolvedVariant] || variantStyles.default;

  const sizeClass = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  const dotSizeClass = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  const displayText =
    label || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClass} ${className} select-none`}
    >
      {withDot && (
        <span
          className={`rounded-full shrink-0 ${styles.dot} ${dotSizeClass}`}
        />
      )}
      <span>{displayText}</span>
    </span>
  );
}

export default StatusChip;
