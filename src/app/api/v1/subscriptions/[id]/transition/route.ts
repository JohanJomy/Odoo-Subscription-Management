import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, HttpError, apiHandler, zodToFieldErrors } from '@/lib/http';
import { requireRole } from '@/server/auth/guard';
import { transitionSubscription } from '@/server/subscriptions/transitions';
import { transitionSchema } from '@/lib/validators';

/**
 * POST /api/v1/subscriptions/:id/transition
 *
 * Executes a subscription status transition.
 * When DRAFT → QUOTATION, quoteValidUntil is set to today + 15 days if not already set.
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireRole(['ADMIN', 'STAFF'], request);
  const { id } = await context.params;
  const body = await request.json();

  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed', zodToFieldErrors(parsed.error));
  }

  const { to, reason, expiryDate } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    // Handle DRAFT → QUOTATION: ensure quoteValidUntil is set
    if (to === 'QUOTATION') {
      const sub = await tx.subscription.findUnique({ where: { id } });
      if (!sub) throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');

      if (!sub.quoteValidUntil) {
        const defaultValidity = new Date();
        defaultValidity.setDate(defaultValidity.getDate() + 15);
        await tx.subscription.update({
          where: { id },
          data: { quoteValidUntil: defaultValidity },
        });
      }
    }

    return transitionSubscription(tx, id, to, {
      userId: user.id,
      userRole: user.role,
      closeReason: reason,
      newExpiryDate: expiryDate,
    });
  });

  return ok(updated);
});
