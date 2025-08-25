// apps/backend/src/controllers/users.controller.ts
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { listUsers, setUserCanCreateBases } from '../services/users.service.js';

/**
 * GET /users
 * Lista usuarios (ruta debe estar protegida con requireAuth + requireSuperadmin en users.routes.ts)
 */
export async function listUsersCtrl(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    return res.json({ ok: true, users });
  } catch (e) {
    console.error('[listUsersCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo listar usuarios' });
  }
}

/**
 * PATCH /users/:id/can-create-bases
 * Body: { can: boolean }
 * Marca / desmarca el permiso global de “crear bases” (sólo SYSADMIN).
 */
export async function setCanCreateBasesCtrl(req: Request, res: Response) {
  try {
    // Validación básica del :id
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    // Validación del body
    const { can } = req.body as { can?: unknown };
    if (typeof can !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Debes enviar { can: boolean }' });
    }

    // Update
    const updated = await setUserCanCreateBases(id, can);
    return res.json({ ok: true, user: updated });
  } catch (e) {
    // Si Prisma no encuentra el registro, lanza P2025
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    console.error('[setCanCreateBasesCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el permiso' });
  }
}