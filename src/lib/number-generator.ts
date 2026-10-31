import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Generates the next sequential unique human-readable number
 * Subscriptions: SUB-0001, SUB-0002, etc.
 * Invoices: INV-2026-0001, INV-2026-0002, etc.
 */
export async function nextNumber(
  tx: TransactionClient | PrismaClient,
  type: 'SUB' | 'INV'
): Promise<string> {
  const currentYear = new Date().getFullYear();

  if (type === 'SUB') {
    const lastSub = await tx.subscription.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });

    if (!lastSub || !lastSub.number) {
      return 'SUB-0001';
    }

    const match = lastSub.number.match(/SUB-(\d+)/);
    const nextSeq = match ? parseInt(match[1], 10) + 1 : 1;
    return `SUB-${String(nextSeq).padStart(4, '0')}`;
  } else {
    // Invoices: INV-<year>-<4 digits>
    const prefix = `INV-${currentYear}-`;
    const lastInv = await tx.invoice.findFirst({
      where: {
        number: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });

    if (!lastInv || !lastInv.number) {
      return `${prefix}0001`;
    }

    const match = lastInv.number.match(new RegExp(`INV-${currentYear}-(\\d+)`));
    const nextSeq = match ? parseInt(match[1], 10) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}

