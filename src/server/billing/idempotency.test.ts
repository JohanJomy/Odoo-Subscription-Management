import { describe, test, expect } from 'vitest';
import { addPeriod } from './pricing';

describe('Billing Idempotency Logic', () => {
  test('compound key [subscriptionId, periodStart] identifies duplicate cycles', () => {
    const existingInvoices = new Set<string>();

    const subId = 'sub_123';
    const periodStart = new Date('2026-11-01T00:00:00Z');
    const compoundKey = `${subId}_${periodStart.toISOString()}`;

    // First billing cycle
    expect(existingInvoices.has(compoundKey)).toBe(false);
    existingInvoices.add(compoundKey);

    // Second run on the same date: MUST identify as existing and skip
    expect(existingInvoices.has(compoundKey)).toBe(true);
  });

  test('catch-up loop generates separate periods for missed cycles', () => {
    const today = new Date('2026-11-01T00:00:00Z');
    let nextInvoiceDate = new Date('2026-08-01T00:00:00Z'); // 3 months overdue
    const expiryDate = new Date('2027-08-01T00:00:00Z');

    const generatedPeriods: { start: string; end: string }[] = [];

    while (nextInvoiceDate <= today && nextInvoiceDate <= expiryDate) {
      const periodStart = new Date(nextInvoiceDate.getTime());
      const periodEnd = addPeriod(periodStart, 'MONTHLY');

      generatedPeriods.push({
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      });

      nextInvoiceDate = periodEnd;
    }

    // Must generate exactly 4 distinct billing periods (Aug, Sep, Oct, Nov), NOT one bundled invoice
    expect(generatedPeriods.length).toBe(4);
    expect(new Date(generatedPeriods[0].start).getUTCMonth()).toBe(7); // August
    expect(new Date(generatedPeriods[1].start).getUTCMonth()).toBe(8); // September
    expect(new Date(generatedPeriods[2].start).getUTCMonth()).toBe(9); // October
    expect(new Date(generatedPeriods[3].start).getUTCMonth()).toBe(10); // November
  });
});

