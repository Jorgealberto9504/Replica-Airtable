import type { Request, Response } from 'express';
import { listUsers, setUserCanCreateBases } from '../services/users.service.js';

// GET /users  -> lista usuarios (sólo SYSADMIN)
export async function listUsersCtrl(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    return res.json({ ok: true, users });
  } catch (e) {
    console.error('[listUsersCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo listar usuarios' });
  }
}

// PATCH /users/:id/can-create-bases  body: { can: boolean } (sólo SYSADMIN)
export async function setCanCreateBasesCtrl(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    const { can } = req.body as { can?: boolean };
    if (typeof can !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Debes enviar { can: boolean }' });
    }

    const updated = await setUserCanCreateBases(id, can);
    return res.json({ ok: true, user: updated });
  } catch (e) {
    console.error('[setCanCreateBasesCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el permiso' });
  }
}