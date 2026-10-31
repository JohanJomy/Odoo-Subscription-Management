import { describe, test, expect } from 'vitest';
import { validateTransition } from './transitions';
import { HttpError } from '@/lib/http-error';

describe('Subscription Status Machine (Transitions)', () => {
  const defaultPlan = {
    closable: true,
    pausable: true,
    renewable: true,
    autoClose: false,
    endDate: null,
  };

  const defaultSub = {
    status: 'DRAFT' as const,
    closeReason: null,
    quoteValidUntil: new Date('2026-11-15T00:00:00Z'),
    startDate: new Date('2026-11-01T00:00:00Z'),
    expiryDate: new Date('2027-10-31T00:00:00Z'),
  };

  test('valid transition flow: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED', () => {
    const today = new Date('2026-11-01T00:00:00Z');

    // 1. DRAFT -> QUOTATION
    const t1 = validateTransition(defaultSub, defaultPlan, 'QUOTATION', { today });
    expect(t1.newStatus).toBe('QUOTATION');

    // 2. QUOTATION -> CONFIRMED
    const t2 = validateTransition(
      { ...defaultSub, status: 'QUOTATION' },
      defaultPlan,
      'CONFIRMED',
      { today }
    );
    expect(t2.newStatus).toBe('CONFIRMED');

    // 3. CONFIRMED -> ACTIVE
    const t3 = validateTransition(
      { ...defaultSub, status: 'CONFIRMED' },
      defaultPlan,
      'ACTIVE',
      { today }
    );
    expect(t3.newStatus).toBe('ACTIVE');
    expect(t3.nextInvoiceDateDelta).toBe('START_DATE');

    // 4. ACTIVE -> CLOSED (CLOSED_EARLY)
    const t4 = validateTransition(
      { ...defaultSub, status: 'ACTIVE' },
      defaultPlan,
      'CLOSED',
      { today, closeReason: 'CLOSED_EARLY' }
    );
    expect(t4.newStatus).toBe('CLOSED');
    expect(t4.newCloseReason).toBe('CLOSED_EARLY');
    expect(t4.nextInvoiceDateDelta).toBe('NULL');
  });

  test('invalid jump returns 409 INVALID_TRANSITION (e.g. DRAFT directly to ACTIVE)', () => {
    expect(() => {
      validateTransition(defaultSub, defaultPlan, 'ACTIVE');
    }).toThrow(HttpError);

    try {
      validateTransition(defaultSub, defaultPlan, 'ACTIVE');
    } catch (err) {
      const httpErr = err as HttpError;
      expect(httpErr.statusCode).toBe(409);
      expect(httpErr.code).toBe('INVALID_TRANSITION');
    }
  });

  test('rejects QUOTATION -> CONFIRMED if quoteValidUntil has passed', () => {
    const expiredSub = {
      ...defaultSub,
      status: 'QUOTATION' as const,
      quoteValidUntil: new Date('2026-10-15T00:00:00Z'),
    };
    const today = new Date('2026-10-31T00:00:00Z');

    expect(() => {
      validateTransition(expiredSub, defaultPlan, 'CONFIRMED', { today });
    }).toThrow(HttpError);

    try {
      validateTransition(expiredSub, defaultPlan, 'CONFIRMED', { today });
    } catch (err) {
      const httpErr = err as HttpError;
      expect(httpErr.statusCode).toBe(409);
      expect(httpErr.code).toBe('QUOTE_EXPIRED');
    }
  });

  test('rejects early close if plan.closable = false', () => {
    const nonClosablePlan = { ...defaultPlan, closable: false };
    const activeSub = { ...defaultSub, status: 'ACTIVE' as const };

    expect(() => {
      validateTransition(activeSub, nonClosablePlan, 'CLOSED', {
        closeReason: 'CLOSED_EARLY',
      });
    }).toThrow(HttpError);

    try {
      validateTransition(activeSub, nonClosablePlan, 'CLOSED', {
        closeReason: 'CLOSED_EARLY',
      });
    } catch (err) {
      const httpErr = err as HttpError;
      expect(httpErr.statusCode).toBe(409);
      expect(httpErr.code).toBe('PLAN_NOT_CLOSABLE');
    }
  });

  test('rejects pause if plan.pausable = false', () => {
    const nonPausablePlan = { ...defaultPlan, pausable: false };
    const activeSub = { ...defaultSub, status: 'ACTIVE' as const };

    expect(() => {
      validateTransition(activeSub, nonPausablePlan, 'CLOSED', {
        closeReason: 'PAUSED',
      });
    }).toThrow(HttpError);

    try {
      validateTransition(activeSub, nonPausablePlan, 'CLOSED', {
        closeReason: 'PAUSED',
      });
    } catch (err) {
      const httpErr = err as HttpError;
      expect(httpErr.statusCode).toBe(409);
      expect(httpErr.code).toBe('PLAN_NOT_PAUSABLE');
    }
  });

  test('resuming paused subscription sets nextInvoiceDateDelta to TODAY', () => {
    const pausedSub = {
      ...defaultSub,
      status: 'CLOSED' as const,
      closeReason: 'PAUSED',
    };

    const res = validateTransition(pausedSub, defaultPlan, 'ACTIVE');
    expect(res.newStatus).toBe('ACTIVE');
    expect(res.newCloseReason).toBeNull();
    expect(res.nextInvoiceDateDelta).toBe('TODAY');
  });

  test('renewing expired subscription requires future date and renewable plan', () => {
    const expiredSub = {
      ...defaultSub,
      status: 'CLOSED' as const,
      closeReason: 'EXPIRED',
    };

    const today = new Date('2026-10-31T00:00:00Z');
    const futureExpiry = new Date('2027-10-31T00:00:00Z');

    const res = validateTransition(expiredSub, defaultPlan, 'ACTIVE', {
      today,
      newExpiryDate: futureExpiry,
    });

    expect(res.newStatus).toBe('ACTIVE');
    expect(res.nextInvoiceDateDelta).toBe('TODAY');

    // Rejects if plan is not renewable
    const nonRenewablePlan = { ...defaultPlan, renewable: false };
    expect(() => {
      validateTransition(expiredSub, nonRenewablePlan, 'ACTIVE', {
        today,
        newExpiryDate: futureExpiry,
      });
    }).toThrow(HttpError);
  });
});

