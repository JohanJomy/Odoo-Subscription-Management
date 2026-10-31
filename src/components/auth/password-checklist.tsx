"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordChecklistProps {
  value: string;
}

export function PasswordChecklist({ value }: PasswordChecklistProps) {
  const rules = [
    {
      label: "At least 9 characters",
      valid: value.length >= 9,
    },
    {
      label: "One uppercase letter (A-Z)",
      valid: /[A-Z]/.test(value),
    },
    {
      label: "One lowercase letter (a-z)",
      valid: /[a-z]/.test(value),
    },
    {
      label: "One special character (e.g. !@#$)",
      valid: /[^A-Za-z0-9]/.test(value),
    },
  ];

  if (!value) return null;

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1.5 text-xs">
      <span className="font-medium text-slate-700 block mb-1">Password requirements:</span>
      {rules.map((rule) => (
        <div key={rule.label} className="flex items-center gap-1.5">
          {rule.valid ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
          ) : (
            <X className="h-3.5 w-3.5 text-slate-400 shrink-0 stroke-[2.5]" />
          )}
          <span
            className={cn(
              "transition-colors",
              rule.valid ? "text-emerald-700 font-medium" : "text-slate-500"
            )}
          >
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}

