"use client";

import React, { useState, useEffect, useId, forwardRef } from "react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  label?: string;
}

export const DEFAULT_CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", label: "INR (₹)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "CAD", symbol: "CA$", label: "CAD (CA$)" },
  { code: "AUD", symbol: "A$", label: "AUD (A$)" },
  { code: "JPY", symbol: "¥", label: "JPY (¥)" },
];

export interface MoneyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "size"
  > {
  /** Value in standard units (e.g. 1000 for ₹1,000) */
  value?: number | string;
  /** Value in integer paise (e.g. 100000 for ₹1,000). Takes precedence if provided. */
  valuePaise?: number;
  defaultValue?: number | string;
  defaultValuePaise?: number;
  /** Emits value in standard units and formatted string */
  onChange?: (value: number | undefined, formattedValue: string) => void;
  /** Emits value in integer paise (e.g. 100000) */
  onChangePaise?: (paise: number | undefined) => void;
  currency?: string;
  currencySymbol?: string;
  currencies?: CurrencyOption[];
  onCurrencyChange?: (currencyCode: string) => void;
  allowCurrencySelect?: boolean;
  precision?: number;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  label?: string;
  error?: string;
  helperText?: string;
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
}

/**
 * Format a number or numeric string to a localized thousand-separated currency string.
 */
function formatNumberWithCommas(
  valStr: string,
  precision: number,
  isBlur: boolean = false
): string {
  if (!valStr) return "";

  const isNegative = valStr.startsWith("-");
  const cleanStr = isNegative ? valStr.slice(1) : valStr;

  const parts = cleanStr.split(".");
  let integerPart = parts[0] || "0";
  let decimalPart = parts[1];

  integerPart = integerPart.replace(/^0+(?=\d)/, "");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (isBlur) {
    if (precision > 0) {
      const paddedDecimal = (decimalPart || "").slice(0, precision).padEnd(precision, "0");
      return `${isNegative ? "-" : ""}${formattedInteger || "0"}.${paddedDecimal}`;
    }
    return `${isNegative ? "-" : ""}${formattedInteger || "0"}`;
  }

  if (decimalPart !== undefined) {
    return `${isNegative ? "-" : ""}${formattedInteger}.${decimalPart.slice(0, precision)}`;
  }

  return `${isNegative ? "-" : ""}${formattedInteger}`;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      valuePaise,
      defaultValue,
      defaultValuePaise,
      onChange,
      onChangePaise,
      currency = "INR",
      currencySymbol,
      currencies = DEFAULT_CURRENCIES,
      onCurrencyChange,
      allowCurrencySelect = false,
      precision = 2,
      allowNegative = false,
      min,
      max,
      label,
      error,
      helperText,
      disabled = false,
      required = false,
      placeholder = "0.00",
      size = "md",
      className = "",
      containerClassName = "",
      id,
      onBlur,
      onFocus,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const [isFocused, setIsFocused] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(currency);

    const activeSymbol =
      currencySymbol ||
      currencies.find((c) => c.code === selectedCurrency)?.symbol ||
      "₹";

    const getRupeeFromPaiseOrValue = (
      val?: number | string,
      paise?: number
    ): number | string | undefined => {
      if (paise !== undefined && paise !== null) {
        return (paise / 100).toFixed(precision);
      }
      return val;
    };

    const formatInitial = (val?: number | string) => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "number" ? val : parseFloat(val.toString().replace(/,/g, ""));
      if (isNaN(num)) return "";
      return formatNumberWithCommas(num.toFixed(precision), precision, true);
    };

    const initialRaw = getRupeeFromPaiseOrValue(
      value !== undefined ? value : defaultValue,
      valuePaise !== undefined ? valuePaise : defaultValuePaise
    );

    const [displayValue, setDisplayValue] = useState(() => formatInitial(initialRaw));

    useEffect(() => {
      if (!isFocused) {
        const targetVal = getRupeeFromPaiseOrValue(value, valuePaise);
        if (targetVal !== undefined) {
          setDisplayValue(formatInitial(targetVal));
        }
      }
    }, [value, valuePaise, precision, isFocused]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;

      let sanitized = rawInput.replace(/[^0-9.-]/g, "");

      if (!allowNegative) {
        sanitized = sanitized.replace(/-/g, "");
      } else {
        const hasMinus = sanitized.startsWith("-");
        sanitized = sanitized.replace(/-/g, "");
        if (hasMinus) sanitized = "-" + sanitized;
      }

      const decimalCount = (sanitized.match(/\./g) || []).length;
      if (decimalCount > 1) {
        const firstDotIndex = sanitized.indexOf(".");
        sanitized =
          sanitized.slice(0, firstDotIndex + 1) +
          sanitized.slice(firstDotIndex + 1).replace(/\./g, "");
      }

      const formatted = formatNumberWithCommas(sanitized, precision, false);
      setDisplayValue(formatted);

      const numericString = formatted.replace(/,/g, "");
      const numericVal =
        numericString === "" || numericString === "-" ? undefined : parseFloat(numericString);

      const paiseVal = numericVal !== undefined ? Math.round(numericVal * 100) : undefined;

      onChange?.(numericVal, formatted);
      onChangePaise?.(paiseVal);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      if (displayValue) {
        const cleanNumber = displayValue.replace(/,/g, "");
        let num = parseFloat(cleanNumber);

        if (!isNaN(num)) {
          if (min !== undefined && num < min) num = min;
          if (max !== undefined && num > max) num = max;

          const formatted = formatNumberWithCommas(num.toFixed(precision), precision, true);
          setDisplayValue(formatted);
          const paiseVal = Math.round(num * 100);
          onChange?.(num, formatted);
          onChangePaise?.(paiseVal);
        } else {
          setDisplayValue("");
          onChange?.(undefined, "");
          onChangePaise?.(undefined);
        }
      }

      onBlur?.(e);
    };

    const handleCurrencySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const code = e.target.value;
      setSelectedCurrency(code);
      onCurrencyChange?.(code);
    };

    const sizeClasses = {
      sm: "py-1 text-xs",
      md: "py-2 text-sm",
      lg: "py-3 text-base",
    }[size];

    const iconSizeClasses = {
      sm: "text-xs px-2.5",
      md: "text-sm px-3",
      lg: "text-base px-3.5",
    }[size];

    return (
      <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1"
          >
            <span>{label}</span>
            {required && <span className="text-red-500 font-bold">*</span>}
          </label>
        )}

        <div
          className={`relative flex items-stretch rounded-lg border transition-all duration-150 ${
            disabled
              ? "bg-neutral-100 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
              : error
              ? "border-red-500 bg-white dark:bg-neutral-900 ring-2 ring-red-500/20"
              : isFocused
              ? "border-blue-500 bg-white dark:bg-neutral-900 ring-2 ring-blue-500/20 shadow-xs"
              : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600"
          }`}
        >
          {allowCurrencySelect ? (
            <div className="relative border-r border-neutral-200 dark:border-neutral-700 flex items-center">
              <select
                disabled={disabled}
                value={selectedCurrency}
                onChange={handleCurrencySelect}
                className={`bg-transparent text-neutral-700 dark:text-neutral-300 font-medium focus:outline-none cursor-pointer pl-3 pr-6 ${iconSizeClasses} appearance-none`}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 text-neutral-400 text-xs">
                ▼
              </span>
            </div>
          ) : (
            <div
              className={`flex items-center justify-center font-medium text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-700 select-none bg-neutral-50/60 dark:bg-neutral-800/30 ${iconSizeClasses}`}
            >
              <span>{activeSymbol}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            disabled={disabled}
            required={required}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`w-full bg-transparent px-3 font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none ${sizeClasses} ${className}`}
            {...rest}
          />

          {displayValue && !disabled && (
            <button
              type="button"
              onClick={() => {
                setDisplayValue("");
                onChange?.(undefined, "");
                onChangePaise?.(undefined);
              }}
              className="px-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center transition"
              title="Clear"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

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
);

MoneyInput.displayName = "MoneyInput";

export default MoneyInput;
