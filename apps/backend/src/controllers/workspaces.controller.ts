import type { Request, Response } from 'express';
import { z } from 'zod';
import { getAuthUser } from '../middlewares/auth.middleware.js';
import {
  // CRUD (activos)
  createWorkspace,
  listMyWorkspaces,
  listAllWorkspacesForSysadmin,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace, // SOFT DELETE
  // Papelera (owner)
  listTrashedWorkspacesForOwner,
  restoreWorkspace,
  deleteWorkspacePermanently,
  emptyWorkspaceTrashForOwner,
  // Papelera (admin/global)
  listTrashedWorkspacesForAdmin,
  purgeTrashedWorkspacesOlderThan,
} from '../services/workspaces.service.js';

// ---------- Schemas ----------
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'name requerido'),
});

const updateWorkspaceSchema = z
  .object({ name: z.string().min(1).optional() })
  .refine((d) => d.name !== undefined, {
    message: 'Debes enviar al menos un campo a actualizar',
  });

// ---------- Helpers ----------
function parseWorkspaceId(req: Request): number {
  const workspaceId = Number(req.params.workspaceId);
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw Object.assign(new Error('workspaceId inválido'), { status: 400 });
  }
  return workspaceId;
}

/* ===========================
   CRUD WORKSPACES (activos)
   =========================== */

export async function createWorkspaceCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
  }

  try {
    const ws = await createWorkspace({ ownerId: me.id, name: parsed.data.name });
    return res.status(201).json({ ok: true, workspace: ws });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    return res.status(500).json({ ok: false, error: 'No se pudo crear el workspace' });
  }
}

export async function listMyWorkspacesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const workspaces = await listMyWorkspaces(me.id);
  return res.json({ ok: true, workspaces });
}

export async function listAllWorkspacesSysadminCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

  const workspaces = await listAllWorkspacesForSysadmin();
  return res.json({ ok: true, workspaces });
}

export async function getWorkspaceCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const workspaceId = parseWorkspaceId(req);
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ ok: false, error: 'Workspace no encontrado' });
    }
    return res.json({ ok: true, workspace });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudo obtener el workspace' });
  }
}

export async function updateWorkspaceCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const workspaceId = parseWorkspaceId(req);

    const parsed = updateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
    }

    const workspace = await updateWorkspace(workspaceId, parsed.data);
    return res.json({ ok: true, workspace });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el workspace' });
  }
}

export async function deleteWorkspaceCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const workspaceId = parseWorkspaceId(req);
    await deleteWorkspace(workspaceId, { userId: me.id, isSysadmin: me.platformRole === 'SYSADMIN' });
    return res.json({ ok: true });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ ok: false, error: e?.message ?? 'No se pudo eliminar el workspace' });
  }
}

/* ===========================
   PAPELERA (owner)
   =========================== */

export async function listMyTrashedWorkspacesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const workspaces = await listTrashedWorkspacesForOwner(me.id);
  return res.json({ ok: true, workspaces });
}

export async function restoreWorkspaceCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const workspaceId = parseWorkspaceId(req);

    const workspace = await restoreWorkspace(workspaceId, {
      userId: me.id,
      isSysadmin: me.platformRole === 'SYSADMIN',
    });
    return res.json({ ok: true, workspace });
  } catch (e: any) {
    console.error('[restoreWorkspaceCtrl]', e);
    if (e?.status) return res.status(e.status).json(e.body ?? { ok: false, error: e.message });
    return res.status(500).json({ ok: false, error: 'No se pudo restaurar el workspace' });
  }
}

export async function deleteWorkspacePermanentCtrl(req: Request, res: Response) {
  try {
    const me = getAuthUser<{ id: number; platformRole: 'USER' | 'SYSADMIN' }>(req);
    if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

    const workspaceId = parseWorkspaceId(req);

    await deleteWorkspacePermanently(workspaceId, {
      userId: me.id,
      isSysadmin: me.platformRole === 'SYSADMIN',
    });
    return res.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ ok: false, error: e.message });
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar definitivamente el workspace' });
  }
}

export async function emptyMyWorkspaceTrashCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ id: number }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });

  await emptyWorkspaceTrashForOwner(me.id);
  return res.json({ ok: true });
}

/* ===========================
   PAPELERA GLOBAL (admin)
   =========================== */

export async function listAllTrashedWorkspacesCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }

  const ownerId = req.query.ownerId !== undefined ? Number(req.query.ownerId) : undefined;
  if (ownerId !== undefined && (!Number.isInteger(ownerId) || ownerId <= 0)) {
    return res.status(400).json({ ok: false, error: 'ownerId inválido' });
  }

  const workspaces = await listTrashedWorkspacesForAdmin({ ownerId });
  return res.json({ ok: true, workspaces });
}

export async function purgeWorkspacesTrashCtrl(req: Request, res: Response) {
  const me = getAuthUser<{ platformRole: 'USER' | 'SYSADMIN' }>(req);
  if (!me) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (me.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }

  const days = Number(req.query.days ?? 30);
  const safeDays = Number.isFinite(days) && days >= 0 ? days : 30;

  await purgeTrashedWorkspacesOlderThan(safeDays);
  return res.json({ ok: true, purgedAfterDays: safeDays });
}