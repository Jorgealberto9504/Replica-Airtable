// apps/backend/src/controllers/audit.controller.ts
// -----------------------------------------------------------------------------
// Audit Controller
// - Lista de eventos de auditoría por base, con filtros y paginación por cursor
// - NO expone la IP en la respuesta
// -----------------------------------------------------------------------------
import type { Request, Response } from 'express';
import { prisma } from '../services/db.js';
import { AuditAction, PlatformRole } from '@prisma/client';

// Tipado mínimo de usuario inyectado por el middleware de auth
type ReqUser = {
  id: number;
  platformRole: PlatformRole;
};

// Helpers de parseo
function toInt(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function toBigInt(v: any): bigint | undefined {
  try {
    if (v === undefined || v === null || v === '') return undefined;
    return BigInt(v);
  } catch {
    return undefined;
  }
}
function toDate(v: any): Date | undefined {
  const d = v ? new Date(String(v)) : undefined;
  return d && !isNaN(d.getTime()) ? d : undefined;
}

// Verificación de permisos: por ahora solo SYSADMIN o dueño de la base
async function canSeeAudit(baseId: number, user: ReqUser | undefined): Promise<boolean> {
  if (!user) return false;
  if (user.platformRole === 'SYSADMIN') return true;

  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { ownerId: true }
  });
  if (!base) return false;
  return base.ownerId === user.id;
}

export async function listAuditEvents(req: Request, res: Response) {
  const baseId = toInt(req.params.baseId);
  if (!baseId) return res.status(400).json({ ok: false, error: 'baseId inválido' });

  const me = (req as any).user as ReqUser | undefined;
  if (!(await canSeeAudit(baseId, me))) {
    return res.status(403).json({ ok: false, error: 'No autorizado para ver auditoría de esta base' });
  }

  // Filtros opcionales
  const action = req.query.action ? String(req.query.action) : undefined;
  const userId = toInt(req.query.userId);
  const tableId = toInt(req.query.tableId);
  const recordId = toInt(req.query.recordId);
  const fieldId = toInt(req.query.fieldId);
  const from = toDate(req.query.from);
  const to = toDate(req.query.to);

  // Paginación por cursor (id BigInt descendente)
  const limit = Math.min(Math.max(Number(req.query.limit ?? 30), 1), 100);
  const cursorId = toBigInt(req.query.cursor);

  const where: any = { baseId };
  if (action && action in AuditAction) where.action = action as AuditAction;
  if (userId) where.userId = userId;
  if (tableId) where.tableId = tableId;
  if (recordId) where.recordId = recordId;
  if (fieldId) where.fieldId = fieldId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as any).gte = from;
    if (to) (where.createdAt as any).lte = to;
  }
  if (cursorId) {
    // Trae los siguientes más antiguos (id < cursor)
    where.id = { lt: cursorId };
  }

  const rows = await prisma.auditEvent.findMany({
    where,
    orderBy: [{ id: 'desc' }], // id BigInt autoincrement → respeta cronología
    take: limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      summary: true,
      details: true,
      // ip: NO se selecciona para no exponerla
      user: { select: { id: true, fullName: true, email: true } },
      table: { select: { id: true, name: true } },
      record: { select: { id: true } },
      field: { select: { id: true, name: true } },
    },
  });

  // Serializamos BigInt y Date; y NO incluimos ip
  const events = rows.map((r) => ({
    id: String(r.id),
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    summary: r.summary,
    details: r.details,
    user: r.user ? { id: r.user.id, fullName: r.user.fullName, email: r.user.email } : null,
    table: r.table ? { id: r.table.id, name: r.table.name } : null,
    recordId: r.record?.id ?? null,
    field: r.field ? { id: r.field.id, name: r.field.name } : null,
  }));

  const nextCursor = rows.length ? String(rows[rows.length - 1].id) : null;

  return res.json({
    ok: true,
    events,
    nextCursor,
  });
}