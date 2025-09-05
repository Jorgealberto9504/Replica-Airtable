// apps/backend/src/controllers/tables.controller.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getAuthUser } from '../middlewares/auth.middleware.js';
import {
  createTable,
  listTablesForBase,          // ← nombre correcto del service
  getTableById,
  updateTable,               // firma: (baseId, tableId, patch)
  deleteTable,               // firma: (baseId, tableId)
  isDuplicateTableNameError,
} from '../services/tables.service.js';

// ---------- Schemas (validación de inputs) ----------
const createTableSchema = z.object({
  name: z.string().min(1, 'name requerido'),
});

const updateTableSchema = z
  .object({
    name: z.string().min(1).optional(),
  })
  .refine((d) => d.name !== undefined, {
    message: 'Debes enviar al menos un campo a actualizar',
  });

// ---------- Helpers locales ----------
function parseBaseId(req: Request): number {
  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    throw Object.assign(new Error('baseId inválido'), { status: 400 });
  }
  return baseId;
}

function parseTableId(req: Request): number {
  const tableId = Number(req.params.tableId);
  if (!Number.isInteger(tableId) || tableId <= 0) {
    throw Object.assign(new Error('tableId inválido'), { status: 400 });
  }
  return tableId;
}

// ---------- Controllers ----------
/**
 * POST /bases/:baseId/tables
 * Crea una tabla en la base dada.
 * Requiere: requireAuth + guard('schema:manage') en ruta.
 */
export async function createTableCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);

    const parsed = createTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
    }

    const table = await createTable(baseId, parsed.data.name);
    return res.status(201).json({ ok: true, table });
  } catch (e: any) {
    // NUEVO T6.4: soportar errores con status/ body lanzados desde service
    if (e?.status) {
      return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    }
    if (isDuplicateTableNameError(e)) {
      return res
        .status(409)
        .json({ ok: false, error: 'Ya existe una tabla con ese nombre en esta base' });
    }
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudo crear la tabla' });
  }
}

/**
 * GET /bases/:baseId/tables
 * Lista las tablas de una base.
 * Requiere: requireAuth + guard('base:view') en ruta.
 */
export async function listTablesCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tables = await listTablesForBase(baseId);
    return res.json({ ok: true, tables });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudieron listar las tablas' });
  }
}

/**
 * GET /bases/:baseId/tables/:tableId
 * Obtiene una tabla por id (verifica que pertenezca a la base).
 * Requiere: requireAuth + guard('base:view') en ruta.
 */
export async function getTableCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tableId = parseTableId(req);

    const table = await getTableById(baseId, tableId);
    if (!table) {
      return res.status(404).json({ ok: false, error: 'Tabla no encontrada' });
    }
    return res.json({ ok: true, table });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudo obtener la tabla' });
  }
}

/**
 * PATCH /bases/:baseId/tables/:tableId
 * Actualiza nombre de la tabla (verifica pertenencia).
 * Requiere: requireAuth + guard('schema:manage') en ruta.
 */
export async function updateTableCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tableId = parseTableId(req);

    const parsed = updateTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
    }

    const table = await updateTable(baseId, tableId, parsed.data);
    return res.json({ ok: true, table });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Tabla no encontrada' });
    }
    // NUEVO T6.4: soportar errores con status/ body lanzados desde service
    if (e?.status) {
      return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    }
    if (isDuplicateTableNameError(e)) {
      return res
        .status(409)
        .json({ ok: false, error: 'Ya existe una tabla con ese nombre en esta base' });
    }
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar la tabla' });
  }
}

/**
 * DELETE /bases/:baseId/tables/:tableId
 * Elimina una tabla de la base (verifica pertenencia).
 * Requiere: requireAuth + guard('schema:manage') en ruta.
 */
export async function deleteTableCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tableId = parseTableId(req);

    await deleteTable(baseId, tableId);
    return res.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Tabla no encontrada' });
    }
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar la tabla' });
  }
}