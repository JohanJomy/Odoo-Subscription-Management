import { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export interface AuditParams {
  entity: string;
  entityId: string;
  action: string;
  userId?: string | null;
  detail?: string | null;
}

export type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Log an event to the audit trail.
 * Accepts either a transaction client `tx` or uses default prisma.
 */
export async function audit(
  client: PrismaTransaction | PrismaClient | undefined,
  params: AuditParams
) {
  const db = client ?? defaultPrisma;
  return (db as any).auditLog.create({
    data: {
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId ?? null,
      detail: params.detail ?? null,
    },
  });
}

export async function writeAudit(
  client: PrismaTransaction | PrismaClient | undefined,
  params: {
    entity: string;
    entityId: string;
    action: string;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return audit(client, {
    entity: params.entity,
    entityId: params.entityId,
    action: params.action,
    userId: params.userId,
    detail: params.metadata ? JSON.stringify(params.metadata) : null,
  });
}

export async function listAuditLogs(limit = 100) {
  return defaultPrisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}
