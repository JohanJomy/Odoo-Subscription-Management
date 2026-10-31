import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { transitionSubscription } from '@/server/subscriptions/transitions';
import { apiSuccess, apiError, HttpError } from '@/lib/http-error';
import { transitionSchema } from '@/lib/validators';

/**
 * POST /api/v1/subscriptions/:id/transition
 * Executes a subscription status transition.
 *
 * Key design note: when DRAFT → QUOTATION, the quoteValidUntil is set
 * from the subscription's existing quoteValidUntil (set at creation from template)
 * or defaults to today + 15 days if not already set.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const parsed = transitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(422, 'VALIDATION_FAILED', 'Validation failed',
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
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
        closeReason: reason,
        newExpiryDate: expiryDate,
      });
    });

    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}
