// apps/backend/src/services/audit.service.ts
// ============================================================================
// Servicio de Auditoría
//  - logAudit: registra un evento (acepta PrismaClient o tx).
//  - listBaseAudit: lista eventos de una base con filtros/paginación.
// ============================================================================

import type { Prisma, PrismaClient, AuditAction } from '@prisma/client';
import { prisma } from './db.js';

// Para permitir prisma o una transacción activa
type DB = PrismaClient | Prisma.TransactionClient;

/** Payload para registrar un evento de auditoría */
export type LogAuditInput = {
  // actor
  userId?: number | null;
  ip?: string | null;

  // ámbito (base es obligatoria, los demás opcionales)
  baseId: number;
  tableId?: number | null;
  recordId?: number | null;
  fieldId?: number | null;

  // acción
  action: AuditAction;
  summary: string;           // frase legible para UI (ej. "Renombró la base a 'Clientes'")
  details?: unknown;         // diffs o datos extras para UI (opcional)
};

/** Registra un evento de auditoría */
export async function logAudit(db: DB = prisma, input: LogAuditInput) {
  const data: Prisma.AuditEventCreateInput = {
    createdAt: new Date(),
    action: input.action,
    summary: input.summary,
    details: input.details as Prisma.InputJsonValue | undefined,

    ip: input.ip ?? null,

    base: { connect: { id: input.baseId } },
    ...(input.tableId ? { table: { connect: { id: input.tableId } } } : {}),
    ...(input.recordId ? { record: { connect: { id: input.recordId } } } : {}),
    ...(input.fieldId ? { field: { connect: { id: input.fieldId } } } : {}),

    ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
  };

  await db.auditEvent.create({ data });
}

/** Filtros para listar auditoría */
export type ListBaseAuditParams = {
  baseId: number;

  // filtros opcionales
  action?: AuditAction | undefined;
  q?: string | undefined;           // busca en summary (case-insensitive)
  from?: Date | string | undefined; // rango fecha inicio (ISO o Date)
  to?: Date | string | undefined;   // rango fecha fin (ISO o Date)
  tableId?: number | undefined;
  recordId?: number | undefined;
  fieldId?: number | undefined;

  // paginación
  page?: number;       // 1 por defecto
  pageSize?: number;   // 30 por defecto, máx 100
};

/** Respuesta de listBaseAudit */
export type ListBaseAuditResult = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  events: Array<{
    id: string; // BigInt serializado
    createdAt: string;
    action: AuditAction;
    summary: string;
    details: unknown;

    user: { id: number; fullName: string; email: string } | null;
    table: { id: number; name: string } | null;
    recordId: number | null;
    field: { id: number; name: string } | null;
  }>;
};

/** Lista eventos de auditoría de una base con filtros y paginación */
export async function listBaseAudit(db: DB = prisma, params: ListBaseAuditParams): Promise<ListBaseAuditResult> {
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 30)));

  // Construcción de filtros
  const createdAt: Prisma.DateTimeFilter | undefined =
    params.from || params.to
      ? {
          ...(params.from ? { gte: new Date(params.from) } : {}),
          ...(params.to ? { lte: new Date(params.to) } : {}),
        }
      : undefined;

  const where: Prisma.AuditEventWhereInput = {
    baseId: params.baseId,
    ...(params.action ? { action: params.action } : {}),
    ...(params.q
      ? { summary: { contains: params.q, mode: 'insensitive' } }
      : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(params.tableId ? { tableId: params.tableId } : {}),
    ...(params.recordId ? { recordId: params.recordId } : {}),
    ...(params.fieldId ? { fieldId: params.fieldId } : {}),
  };

  const [total, rows] = await Promise.all([
    db.auditEvent.count({ where }),
    db.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        action: true,
        summary: true,
        details: true,
        recordId: true,

        user: { select: { id: true, fullName: true, email: true } },
        table: { select: { id: true, name: true } },
        field: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
    events: rows.map((r) => ({
      id: r.id.toString(), // BigInt → string para JSON
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      summary: r.summary,
      details: r.details,
      user: r.user ? { id: r.user.id, fullName: r.user.fullName, email: r.user.email } : null,
      table: r.table ? { id: r.table.id, name: r.table.name } : null,
      recordId: r.recordId,
      field: r.field ? { id: r.field.id, name: r.field.name } : null,
    })),
  };
}