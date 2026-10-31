/**
 * Money utilities:
 * In LoopLedger, money is always stored as integers in paise (₹1 = 100 paise).
 * Never floats in the database or calculation engines.
 */

export function formatMoney(paise: number): string {
  const rupees = (paise ?? 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

// P1 naming
export function paiseToRupees(paise: number): number {
  return Number(((paise ?? 0) / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((rupees ?? 0) * 100);
}

// P2 aliases for compatibility
export const toPaise = rupeesToPaise;
export const toRupees = paiseToRupees;
