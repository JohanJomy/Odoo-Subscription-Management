"use client";

import React, { useId } from "react";

export interface FormFieldProps {
  label?: string;
  name?: string;
  id?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  tooltip?: string;
  className?: string;
  labelClassName?: string;
  children:
    | React.ReactNode
    | ((props: { id: string; error?: string; required?: boolean }) => React.ReactNode);
}

export function FormField({
  label,
  name,
  id,
  required = false,
  error,
  helperText,
  tooltip,
  className = "",
  labelClassName = "",
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id || name || generatedId;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={fieldId}
            className={`text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1 ${labelClassName}`}
          >
            <span>{label}</span>
            {required && <span className="text-red-500 font-bold">*</span>}
          </label>
          {tooltip && (
            <span
              title={tooltip}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help"
            >
              ℹ
            </span>
          )}
        </div>
      )}

      {typeof children === "function"
        ? children({ id: fieldId, error, required })
        : children}

      {error ? (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default FormField;
