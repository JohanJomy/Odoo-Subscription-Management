import React from "react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface MoneyTextProps {
  paise: number;
  className?: string;
}

export function MoneyText({ paise, className }: MoneyTextProps) {
  return (
    <span className={cn("tabular-nums font-medium", className)}>
      {formatMoney(paise)}
    </span>
  );
}
