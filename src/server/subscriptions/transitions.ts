import { PrismaClient } from '@prisma/client';
import { HttpError } from '@/lib/http-error';
import { SubscriptionStatus, CloseReason } from '@/lib/constants';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface TransitionContext {
  userId?: string;
  userRole?: string;
  isOwner?: boolean;
  today?: Date;
  newExpiryDate?: Date;
  closeReason?: CloseReason;
}

export interface TransitionResult {
  previousStatus: SubscriptionStatus;
  newStatus: SubscriptionStatus;
  closeReason?: string | null;
  nextInvoiceDate?: Date | null;
  quoteValidUntil?: Date | null;
}

/**
 * Validates if a transition is permitted according to the strict state machine matrix.
 */
export function validateTransition(
  current: {
    status: SubscriptionStatus;
    closeReason?: string | null;
    quoteValidUntil?: Date | null;
    expiryDate: Date;
    startDate: Date;
  },
  plan: {
    closable: boolean;
    pausable: boolean;
    renewable: boolean;
    autoClose: boolean;
    endDate?: Date | null;
  },
  to: SubscriptionStatus,
  context: TransitionContext = {}
): {
  newStatus: SubscriptionStatus;
  newCloseReason?: CloseReason | null;
  nextInvoiceDateDelta?: 'START_DATE' | 'TODAY' | 'NULL' | 'UNCHANGED';
} {
  const today = context.today || new Date();

  // 1. DRAFT -> QUOTATION
  if (current.status === 'DRAFT' && to === 'QUOTATION') {
    return {
      newStatus: 'QUOTATION',
      newCloseReason: null,
      nextInvoiceDateDelta: 'UNCHANGED',
    };
  }

  // 2. QUOTATION -> CONFIRMED
  if (current.status === 'QUOTATION' && to === 'CONFIRMED') {
    if (current.quoteValidUntil && current.quoteValidUntil < today) {
      throw new HttpError(409, 'QUOTE_EXPIRED', 'Quotation validity period has expired');
    }
    return {
      newStatus: 'CONFIRMED',
      newCloseReason: null,
      nextInvoiceDateDelta: 'UNCHANGED',
    };
  }

  // 3. CONFIRMED -> ACTIVE
  if (current.status === 'CONFIRMED' && to === 'ACTIVE') {
    return {
      newStatus: 'ACTIVE',
      newCloseReason: null,
      nextInvoiceDateDelta: 'START_DATE',
    };
  }

  // 4. ACTIVE -> CLOSED (CLOSED_EARLY)
  if (current.status === 'ACTIVE' && to === 'CLOSED' && context.closeReason === 'CLOSED_EARLY') {
    if (!plan.closable) {
      throw new HttpError(409, 'PLAN_NOT_CLOSABLE', 'This plan does not permit closing early');
    }
    return {
      newStatus: 'CLOSED',
      newCloseReason: 'CLOSED_EARLY',
      nextInvoiceDateDelta: 'NULL',
    };
  }

  // 5. ACTIVE -> CLOSED (PAUSED)
  if (current.status === 'ACTIVE' && to === 'CLOSED' && context.closeReason === 'PAUSED') {
    if (!plan.pausable) {
      throw new HttpError(409, 'PLAN_NOT_PAUSABLE', 'This plan does not permit pausing');
    }
    return {
      newStatus: 'CLOSED',
      newCloseReason: 'PAUSED',
      nextInvoiceDateDelta: 'NULL',
    };
  }

  // 6. CLOSED (PAUSED) -> ACTIVE (Resume)
  if (current.status === 'CLOSED' && current.closeReason === 'PAUSED' && to === 'ACTIVE') {
    return {
      newStatus: 'ACTIVE',
      newCloseReason: null,
      nextInvoiceDateDelta: 'TODAY',
    };
  }

  // 7. CLOSED (EXPIRED) -> ACTIVE (Renew)
  if (current.status === 'CLOSED' && current.closeReason === 'EXPIRED' && to === 'ACTIVE') {
    if (!plan.renewable) {
      throw new HttpError(409, 'PLAN_NOT_RENEWABLE', 'This plan does not permit renewals');
    }
    if (!context.newExpiryDate || context.newExpiryDate <= today) {
      throw new HttpError(422, 'INVALID_EXPIRY_DATE', 'Renewal requires a future expiry date');
    }
    return {
      newStatus: 'ACTIVE',
      newCloseReason: null,
      nextInvoiceDateDelta: 'TODAY',
    };
  }

  // 8. ACTIVE -> CLOSED (EXPIRED) via housekeeping
  if (current.status === 'ACTIVE' && to === 'CLOSED' && context.closeReason === 'EXPIRED') {
    return {
      newStatus: 'CLOSED',
      newCloseReason: 'EXPIRED',
      nextInvoiceDateDelta: 'NULL',
    };
  }

  // 9. QUOTATION -> CLOSED (EXPIRED) via housekeeping
  if (current.status === 'QUOTATION' && to === 'CLOSED' && context.closeReason === 'EXPIRED') {
    return {
      newStatus: 'CLOSED',
      newCloseReason: 'EXPIRED',
      nextInvoiceDateDelta: 'NULL',
    };
  }

  // Any other move is invalid
  throw new HttpError(
    409,
    'INVALID_TRANSITION',
    `Cannot transition subscription from ${current.status}${current.closeReason ? ` (${current.closeReason})` : ''} to ${to}`
  );
}

/**
 * Executes a status transition within an atomic database transaction.
 */
export async function transitionSubscription(
  tx: TransactionClient,
  subscriptionId: string,
  to: SubscriptionStatus,
  context: TransitionContext = {}
) {
  const sub = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!sub) {
    throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription does not exist');
  }

  const result = validateTransition(
    {
      status: sub.status as SubscriptionStatus,
      closeReason: sub.closeReason,
      quoteValidUntil: sub.quoteValidUntil,
      expiryDate: sub.expiryDate,
      startDate: sub.startDate,
    },
    sub.plan,
    to,
    context
  );

  let nextInvoiceDate = sub.nextInvoiceDate;
  if (result.nextInvoiceDateDelta === 'START_DATE') {
    nextInvoiceDate = sub.startDate;
  } else if (result.nextInvoiceDateDelta === 'TODAY') {
    nextInvoiceDate = context.today || new Date();
  } else if (result.nextInvoiceDateDelta === 'NULL') {
    nextInvoiceDate = null;
  }

  const updated = await tx.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: result.newStatus,
      closeReason: result.newCloseReason !== undefined ? result.newCloseReason : sub.closeReason,
      nextInvoiceDate,
      ...(context.newExpiryDate ? { expiryDate: context.newExpiryDate } : {}),
    },
  });

  // Write to AuditLog
  await tx.auditLog.create({
    data: {
      entity: 'Subscription',
      entityId: subscriptionId,
      action: 'TRANSITION',
      userId: context.userId,
      detail: `Transitioned from ${sub.status} to ${result.newStatus}${result.newCloseReason ? ` (${result.newCloseReason})` : ''}`,
    },
  });

  return updated;
}

/**
 * Customer/Staff action to pause a subscription
 */
export async function pauseSubscription(
  tx: TransactionClient,
  subscriptionId: string,
  userId?: string
) {
  return transitionSubscription(tx, subscriptionId, 'CLOSED', {
    userId,
    closeReason: 'PAUSED',
  });
}

/**
 * Customer/Staff action to resume a paused subscription
 */
export async function resumeSubscription(
  tx: TransactionClient,
  subscriptionId: string,
  userId?: string
) {
  return transitionSubscription(tx, subscriptionId, 'ACTIVE', {
    userId,
  });
}

/**
 * Customer action to update seat quantity (only while ACTIVE)
 */
export async function changeSeats(
  tx: TransactionClient,
  subscriptionId: string,
  lineId: string,
  newQty: number,
  userId?: string
) {
  const sub = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, lines: true },
  });

  if (!sub) {
    throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription does not exist');
  }

  if (sub.status !== 'ACTIVE') {
    throw new HttpError(409, 'SUBSCRIPTION_NOT_ACTIVE', 'Can only change seats on active subscriptions');
  }

  if (newQty < sub.plan.minQty) {
    throw new HttpError(
      422,
      'MINIMUM_QUANTITY_NOT_MET',
      `Quantity must be at least the plan minimum of ${sub.plan.minQty}`
    );
  }

  const line = sub.lines.find((l) => l.id === lineId);
  if (!line) {
    throw new HttpError(404, 'LINE_NOT_FOUND', 'Subscription line item not found');
  }

  const updatedLine = await tx.subscriptionLine.update({
    where: { id: lineId },
    data: {
      qty: newQty,
      amount: newQty * line.unitPrice,
    },
  });

  await tx.auditLog.create({
    data: {
      entity: 'Subscription',
      entityId: subscriptionId,
      action: 'SEAT_CHANGE',
      userId,
      detail: `Changed quantity on line ${lineId} from ${line.qty} to ${newQty}`,
    },
  });

  return updatedLine;
}

