// apps/backend/src/controllers/users.controller.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  // NUEVO ADMIN
  listUsersAdmin,
  getUserByIdAdmin,
  updateUserAdmin,
  resetUserPasswordAdmin,
  // COMPAT (existentes)
  listUsers,
  setUserCanCreateBases,
} from '../services/users.service.js';
import { isStrongPassword, STRONG_PWD_HELP } from '../services/security/password.rules.js';

/* =========================================================
   ADMIN NUEVO: Listado con filtros / paginación
   ========================================================= */
/**
 * GET /users/admin?q=&role=&isActive=&canCreateBases=&page=&limit=
 * Protegido por: requireAuth + guardGlobal('platform:users:manage')
 */
export async function listUsersAdminCtrl(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const role = req.query.role === 'SYSADMIN' || req.query.role === 'USER'
      ? (req.query.role as 'SYSADMIN' | 'USER')
      : undefined;

    const isActive =
      typeof req.query.isActive === 'string'
        ? req.query.isActive === 'true'
        : undefined;

    const canCreateBases =
      typeof req.query.canCreateBases === 'string'
        ? req.query.canCreateBases === 'true'
        : undefined;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const data = await listUsersAdmin({
      q,
      role,
      isActive,
      canCreateBases,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 && limit <= 200 ? limit : 20,
    });

    return res.json({ ok: true, ...data });
  } catch (e) {
    console.error('[listUsersAdminCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo listar usuarios' });
  }
}

/* =========================================================
   ADMIN NUEVO: Ver detalle de usuario
   ========================================================= */
/** GET /users/admin/:id */
export async function getUserAdminCtrl(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    const user = await getUserByIdAdmin(id);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    return res.json({ ok: true, user });
  } catch (e) {
    console.error('[getUserAdminCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo obtener el usuario' });
  }
}

/* =========================================================
   ADMIN NUEVO: Actualizar datos / permisos
   ========================================================= */
/** PATCH /users/admin/:id */
export async function updateUserAdminCtrl(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    const schema = z
      .object({
        fullName: z.string().min(1).optional(),
        platformRole: z.enum(['USER', 'SYSADMIN']).optional(),
        isActive: z.boolean().optional(),
        canCreateBases: z.boolean().optional(),
        mustChangePassword: z.boolean().optional(),
      })
      .refine(
        (b) =>
          b.fullName !== undefined ||
          b.platformRole !== undefined ||
          b.isActive !== undefined ||
          b.canCreateBases !== undefined ||
          b.mustChangePassword !== undefined,
        { message: 'Debes enviar al menos un campo a actualizar' }
      );

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Body inválido' });
    }

    const user = await updateUserAdmin(id, parsed.data);
    return res.json({ ok: true, user });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ ok: false, error: e.message });
    console.error('[updateUserAdminCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el usuario' });
  }
}

/* =========================================================
   ADMIN NUEVO: Reset de contraseña
   ========================================================= */
/** POST /users/admin/:id/reset-password  { newPassword } */
export async function resetUserPasswordAdminCtrl(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword) {
      return res.status(400).json({ ok: false, error: 'newPassword requerido' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ ok: false, error: STRONG_PWD_HELP });
    }

    const user = await resetUserPasswordAdmin(id, newPassword);
    return res.json({ ok: true, user });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    console.error('[resetUserPasswordAdminCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo resetear la contraseña' });
  }
}

/* =========================================
   COMPAT (DEPRECATED): endpoints antiguos
   ========================================= */

/**
 * GET /users
 * (DEPRECATED) — Usa /users/admin
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
 * (DEPRECATED) — Usa PATCH /users/admin/:id con { canCreateBases }
 */
export async function setCanCreateBasesCtrl(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    const { can } = req.body as { can?: unknown };
    if (typeof can !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Debes enviar { can: boolean }' });
    }

    const updated = await setUserCanCreateBases(id, can);
    return res.json({ ok: true, user: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    console.error('[setCanCreateBasesCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el permiso' });
  }
}