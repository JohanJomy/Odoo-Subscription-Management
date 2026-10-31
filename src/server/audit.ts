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
  client: PrismaTransaction | PrismaClient,
  input: { action: string; entity: string; entityId: string; metadata?: Record<string, unknown> },
) {
  return audit(client, {
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    detail: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

export async function listAuditLogs(limit = 100) {
  const rows = await defaultPrisma.auditLog.findMany({ orderBy: { at: "desc" }, take: limit });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    actor: row.userId ?? "system",
    metadata: row.detail
      ? (() => {
          try {
            return JSON.parse(row.detail) as Record<string, unknown>;
          } catch {
            return { detail: row.detail };
          }
        })()
      : null,
    createdAt: row.at.toISOString(),
  }));
}
