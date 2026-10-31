/**
 * Guard & Access Control Tests
 * Verifies scopeToCustomer enforces data isolation.
 */
import { describe, test, expect } from 'vitest';
import { scopeToCustomer } from './guard';
import { HttpError } from '@/lib/http';

describe('scopeToCustomer — customer data isolation', () => {
  test('ADMIN role returns empty scope (unrestricted)', () => {
    const scope = scopeToCustomer({ role: 'ADMIN', customerId: null });
    expect(scope).toEqual({});
  });

  test('STAFF role returns empty scope (unrestricted)', () => {
    const scope = scopeToCustomer({ role: 'STAFF', customerId: 'cust_xyz' });
    expect(scope).toEqual({});
  });

  test('CUSTOMER role returns their customerId as a Prisma where-clause filter', () => {
    const scope = scopeToCustomer({ role: 'CUSTOMER', customerId: 'cust_abc' });
    expect(scope).toEqual({ customerId: 'cust_abc' });
  });

  test('CUSTOMER with no linked profile throws 403 FORBIDDEN', () => {
    expect(() => {
      scopeToCustomer({ role: 'CUSTOMER', customerId: null });
    }).toThrow(HttpError);

    try {
      scopeToCustomer({ role: 'CUSTOMER', customerId: null });
    } catch (err) {
      const httpErr = err as HttpError;
      expect(httpErr.status).toBe(403);
      expect(httpErr.code).toBe('FORBIDDEN');
    }
  });

  test('customer A scope cannot match customer B data (isolation guarantee)', () => {
    const scopeA = scopeToCustomer({ role: 'CUSTOMER', customerId: 'cust_A' });
    const scopeB = scopeToCustomer({ role: 'CUSTOMER', customerId: 'cust_B' });

    // When Prisma applies scopeA as a WHERE clause, it will find no rows
    // owned by cust_B — simulated here by direct comparison
    const subOwnedByB = { customerId: 'cust_B', id: 'sub_1' };
    const matchesA = subOwnedByB.customerId === (scopeA as { customerId: string }).customerId;
    const matchesB = subOwnedByB.customerId === (scopeB as { customerId: string }).customerId;

    expect(matchesA).toBe(false); // cust_A's scope does NOT match cust_B's sub
    expect(matchesB).toBe(true);  // cust_B's scope correctly matches their own sub
  });
});

