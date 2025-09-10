import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getAuthUser } from '../middlewares/auth.middleware.js';
import {
  createTable,
  listTablesForBase,
  listTablesNavForBase,   // <-- NUEVO
  reorderTables,          // <-- NUEVO
  getTableById,
  updateTable,
  deleteTable,
  isDuplicateTableNameError,
  // ===== Papelera (owner) =====
  listTrashedTablesForBase,
  restoreTable,
  deleteTablePermanently,
  emptyTrashForBase,
  // ===== NUEVO: Papelera GLOBAL (admin) =====
  listTrashedTablesForAdmin,
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

const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
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
    if (e?.status) {
      return res.status(e.status).json(e.body ?? { ok: false, error: e.message }); // base en papelera (409), etc.
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
 * Lista las tablas de una base (excluye papelera).
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
 * GET /bases/:baseId/tables/nav
 * Lista ligera para la barra de tabs: id, name, position.
 * Requiere: requireAuth + guard('base:view') en ruta.
 */
export async function listTablesNavCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tabs = await listTablesNavForBase(baseId);
    return res.json({ ok: true, tabs });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudo obtener la barra de tablas' });
  }
}

/**
 * PATCH /bases/:baseId/tables/reorder
 * Body: { orderedIds: number[] } (ids de TODAS las tablas activas en el nuevo orden)
 * Requiere: requireAuth + guard('schema:manage') en ruta.
 */
export async function reorderTablesCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
    }

    await reorderTables(baseId, parsed.data.orderedIds);
    // Devolvemos el nuevo orden para que el front rehidrate sin pedir otra vez:
    const tabs = await listTablesNavForBase(baseId);
    return res.json({ ok: true, tabs });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudo reordenar' });
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
    if (e?.status) {
      return res.status(e.status).json(e.body ?? { ok: false, error: e.message }); // base/tabla en papelera (409)
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
 * NOTA: ahora hace SOFT DELETE (papelera)
 */
export async function deleteTableCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tableId = parseTableId(req);

    await deleteTable(baseId, tableId); // mueve a papelera o idempotente si base ya está en papelera
    return res.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Tabla no encontrada' });
    }
    if (e?.status) {
      return res.status(e.status).json({ ok: false, error: e.message }); // <-- NUEVO
    }
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar la tabla' });
  }
}

/* ===========================
   ====== Papelera (owner) ===
   =========================== */

/** GET /bases/:baseId/tables/trash — Lista tablas en papelera (owner) */
export async function listTrashedTablesCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
    const baseId = parseBaseId(req);
    const tables = await listTrashedTablesForBase(baseId);
    return res.json({ ok: true, tables });
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ ok: false, error: e?.message ?? 'No se pudo listar la papelera de tablas' });
  }
}

/** POST /bases/:baseId/tables/:tableId/restore — Restaurar tabla (owner) */
export async function restoreTableCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tableId = parseTableId(req);

    const table = await restoreTable(baseId, tableId);
    return res.json({ ok: true, table });
  } catch (e: any) {
    if (e?.status) {
      return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: 'No se pudo restaurar la tabla' });
  }
}

/** DELETE /bases/:baseId/tables/:tableId/permanent — Borrado definitivo (owner) */
export async function deleteTablePermanentCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    const tableId = parseTableId(req);

    await deleteTablePermanently(baseId, tableId);
    return res.json({ ok: true });
  } catch (e: any) {
    if (e?.status) {
      return res.status(e.status).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar definitivamente la tabla' });
  }
}

/** POST /bases/:baseId/tables/trash/empty — Vaciar papelera de tablas de la base (owner) */
export async function emptyTableTrashCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const baseId = parseBaseId(req);
    await emptyTrashForBase(baseId);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ ok: false, error: e?.message ?? 'No se pudo vaciar la papelera de la base' });
  }
}

/* ===========================
   ======= NUEVO ADMIN =======
   =========================== */
/**
 * GET /bases/admin/:baseId/tables/trash
 * Lista la papelera de tablas de una base — SOLO SYSADMIN
 */
export async function listTrashedTablesAdminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

  const baseId = parseBaseId(req);
  const tables = await listTrashedTablesForBase(baseId);
  return res.json({ ok: true, tables });
}

/**
 * GET /bases/admin/tables/trash?ownerId=&baseId=
 * Papelera GLOBAL de tablas — SOLO SYSADMIN
 */
export async function listAllTrashedTablesAdminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

  const ownerId = req.query.ownerId !== undefined ? Number(req.query.ownerId) : undefined;
  const baseId = req.query.baseId !== undefined ? Number(req.query.baseId) : undefined;
  if (ownerId !== undefined && (!Number.isInteger(ownerId) || ownerId <= 0)) {
    return res.status(400).json({ ok: false, error: 'ownerId inválido' });
  }
  if (baseId !== undefined && (!Number.isInteger(baseId) || baseId <= 0)) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  const tables = await listTrashedTablesForAdmin({ ownerId, baseId });
  return res.json({ ok: true, tables });
}

/**
 * POST /bases/admin/:baseId/tables/:tableId/restore
 * Restaurar tabla en papelera — SOLO SYSADMIN
 */
export async function restoreTableAdminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

  const baseId = parseBaseId(req);
  const tableId = parseTableId(req);

  try {
    const table = await restoreTable(baseId, tableId);
    return res.json({ ok: true, table });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    if (isDuplicateTableNameError(e)) {
      return res.status(409).json({ ok: false, error: 'Nombre de tabla en uso (activa)' });
    }
    return res.status(500).json({ ok: false, error: 'No se pudo restaurar la tabla' });
  }
}

/**
 * DELETE /bases/admin/:baseId/tables/:tableId/permanent
 * Borrado definitivo de tabla — SOLO SYSADMIN
 */
export async function deleteTablePermanentAdminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

  const baseId = parseBaseId(req);
  const tableId = parseTableId(req);

  try {
    await deleteTablePermanently(baseId, tableId);
    return res.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ ok: false, error: e.message });
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar definitivamente la tabla' });
  }
}