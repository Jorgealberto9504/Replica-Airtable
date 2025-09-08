// apps/backend/src/controllers/bases.controller.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getAuthUser } from '../middlewares/auth.middleware.js';
import {
  createBase,
  listAccessibleBasesForUser,
  listAllBasesForSysadmin,   // <-- existente
  getBaseById,
  updateBase,
  deleteBase,
  // ===== Papelera (owner) =====
  listTrashedBasesForOwner,
  restoreBase,
  deleteBasePermanently,
  emptyTrashForOwner,
  purgeTrashedBasesOlderThan,   // PURGE (admin)
  // ===== NUEVO ADMIN GLOBAL =====
  listTrashedBasesForAdmin,     // <-- NUEVO: ya lo tienes en services, lo importamos
} from '../services/bases.service.js';
// PURGE (admin): también purgamos tablas desde aquí
import { purgeTrashedTablesOlderThan } from '../services/tables.service.js';

// Schemas
const createBaseSchema = z.object({
  name: z.string().min(1, 'name requerido'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

const updateBaseSchema = z
  .object({
    name: z.string().min(1).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  })
  .refine((d) => d.name !== undefined || d.visibility !== undefined, {
    message: 'Debes enviar al menos un campo a actualizar',
  });

export async function createBaseCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const parsed = createBaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
  }

  try {
    const base = await createBase({
      ownerId: me.id,
      name: parsed.data.name,
      visibility: parsed.data.visibility ?? 'PRIVATE',
    });
    return res.status(201).json({ ok: true, base });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json(err.body ?? { ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo crear la base' });
  }
}

export async function listMyBasesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const bases =
    me.platformRole === 'SYSADMIN'
      ? await listAllBasesForSysadmin(me.id)   // SYSADMIN ve TODAS (excluye papelera)
      : await listAccessibleBasesForUser(me.id); // excluye papelera

  return res.json({ ok: true, bases });
}

export async function getBaseCtrl(req: Request, res: Response) {
  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  const base = await getBaseById(baseId); // ya excluye papelera
  if (!base) return res.status(404).json({ ok: false, error: 'Base no encontrada' });

  return res.json({ ok: true, base });
}

export async function updateBaseCtrl(req: Request, res: Response) {
  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  const parsed = updateBaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
  }

  try {
    const base = await updateBase(baseId, parsed.data);
    return res.json({ ok: true, base });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json(err.body ?? { ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar la base' });
  }
}

export async function deleteBaseCtrl(req: Request, res: Response) {
  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  await deleteBase(baseId); // SOFT DELETE (papelera)
  return res.json({ ok: true });
}

/* ===========================
   ===== Papelera (owner) =====
   =========================== */

export async function listMyTrashedBasesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const bases = await listTrashedBasesForOwner(me.id);
  return res.json({ ok: true, bases });
}

export async function restoreBaseCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  try {
    const base = await restoreBase(baseId, me.id);
    return res.json({ ok: true, base });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json(err.body ?? { ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo restaurar la base' });
  }
}

export async function deleteBasePermanentCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  try {
    await deleteBasePermanently(baseId, me.id);
    return res.json({ ok: true });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar definitivamente la base' });
  }
}

export async function emptyMyTrashCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  await emptyTrashForOwner(me.id);
  return res.json({ ok: true });
}

/* ===========================
   ===== PURGE (admin) =======
   =========================== */

export async function purgeTrashCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }
  const days = Number(req.query.days ?? 30);
  const safeDays = Number.isFinite(days) && days >= 0 ? days : 30;

  await purgeTrashedTablesOlderThan(safeDays);
  await purgeTrashedBasesOlderThan(safeDays);

  return res.json({ ok: true, purgedAfterDays: safeDays });
}

/* ===========================
   ===== NUEVO ADMIN =========
   =========================== */
/** GET /bases/admin/trash?ownerId= — Listar papelera global de bases (SOLO SYSADMIN) */
export async function listAllTrashedBasesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }

  const ownerId = req.query.ownerId !== undefined ? Number(req.query.ownerId) : undefined;
  if (ownerId !== undefined && (!Number.isInteger(ownerId) || ownerId <= 0)) {
    return res.status(400).json({ ok: false, error: 'ownerId inválido' });
  }

  // usamos tu service existente:
  const bases = await listTrashedBasesForAdmin({ ownerId }); // <-- USA TU FUNCIÓN
  return res.json({ ok: true, bases });
}

/** POST /bases/admin/:baseId/restore — Restaurar base desde papelera (SOLO SYSADMIN) */
export async function restoreBaseAdminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }

  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  try {
    // Usamos la sobrecarga que permite SYSADMIN
    const base = await restoreBase(baseId, { userId: me.id, isSysadmin: true });
    return res.json({ ok: true, base });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json(err.body ?? { ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo restaurar la base' });
  }
}

/** DELETE /bases/admin/:baseId/permanent — Borrado definitivo (SOLO SYSADMIN) */
export async function deleteBasePermanentAdminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }

  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  try {
    // Usamos la sobrecarga que permite SYSADMIN
    await deleteBasePermanently(baseId, { userId: me.id, isSysadmin: true });
    return res.json({ ok: true });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar definitivamente la base' });
  }
}