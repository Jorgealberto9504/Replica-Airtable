// apps/backend/src/controllers/bases.controller.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getAuthUser } from '../middlewares/auth.middleware.js';
import {
  createBase,
  listAccessibleBasesForUser,
  listAllBasesForSysadmin,   // <-- NUEVO
  getBaseById,
  updateBase,
  deleteBase,
} from '../services/bases.service.js';

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

  try { // NUEVO T6.4: capturar 409 que viene desde service
    const base = await createBase({
      ownerId: me.id,
      name: parsed.data.name,
      visibility: parsed.data.visibility ?? 'PRIVATE',
    });
    return res.status(201).json({ ok: true, base });
  } catch (err: any) { // NUEVO T6.4
    if (err.status) return res.status(err.status).json(err.body ?? { ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo crear la base' });
  }
}

export async function listMyBasesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const bases =
    me.platformRole === 'SYSADMIN'
      ? await listAllBasesForSysadmin(me.id)   // <-- SYSADMIN ve TODAS
      : await listAccessibleBasesForUser(me.id);

  return res.json({ ok: true, bases });
}

export async function getBaseCtrl(req: Request, res: Response) {
  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  const base = await getBaseById(baseId);
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

  try { // NUEVO T6.4: capturar 409 si el rename rompe la unicidad (ownerId, name)
    const base = await updateBase(baseId, parsed.data);
    return res.json({ ok: true, base });
  } catch (err: any) { // NUEVO T6.4
    if (err.status) return res.status(err.status).json(err.body ?? { ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar la base' });
  }
}

export async function deleteBaseCtrl(req: Request, res: Response) {
  const baseId = Number(req.params.baseId);
  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ ok: false, error: 'baseId inválido' });
  }

  await deleteBase(baseId);
  return res.json({ ok: true });
}