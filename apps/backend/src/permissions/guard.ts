// apps/backend/src/permissions/guard.ts
import type { Request, Response, NextFunction } from 'express';
import { buildPermissionContext } from './context.js';
import { can } from './rules.js';
import type { Action } from './types.js';
import { getAuthUser } from '../middlewares/auth.middleware.js'; // <-- NUEVO

/**
 * Extrae baseId desde params/body/query y valida que sea entero > 0.
 * Lanza error con status=400 si es inválido.
 */
function extractBaseId(req: Request): number {
  const raw = (req.params as any).baseId ?? (req.body as any).baseId ?? (req.query as any).baseId;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error('baseId inválido'), { status: 400 });
  }
  return id;
}

/**
 * Guard para acciones que dependen de una base concreta.
 * Uso: router.get('/:baseId', requireAuth, guard('base:view'), controller);
 */
export function guard(action: Action) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const baseId = extractBaseId(req);
      const ctx = await buildPermissionContext(req, baseId);

      if (!can(ctx, action)) {
        return res.status(403).json({ ok: false, error: 'Forbidden', action });
      }

      (req as any).perm = { ctx }; // opcional para reutilizar en el controller
      next();
    } catch (e: any) {
      return res
        .status(e?.status ?? 500)
        .json({ ok: false, error: e?.message ?? 'Error de permisos' });
    }
  };
}

/**
 * Guard para acciones de plataforma (no requieren baseId).
 * Ej.: crear bases, administrar usuarios, etc.
 * Uso: router.post('/admin/register', requireAuth, guardGlobal('platform:users:manage'), controller);
 *      router.post('/bases', requireAuth, guardGlobal('bases:create'), controller);
 */
export function guardGlobal(action: Action) {
  return (req: Request, res: Response, next: NextFunction) => {
    // requireAuth debe correr antes para poblar req.user
    const me = getAuthUser<{
      id: number;
      platformRole: 'USER' | 'SYSADMIN';
      canCreateBases: boolean;
    }>(req);

    if (!me) {
      return res.status(401).json({ ok: false, error: 'No autenticado' });
    }

    // Contexto “dummy” de base para cumplir el tipo, pero sin consultar DB
    const ctx = {
      userId: me.id,
      platformRole: me.platformRole,
      canCreateBases: me.canCreateBases,

      baseId: 0,
      baseVisibility: 'PUBLIC' as const,
      isOwner: false,
      membershipRole: undefined,
    };

    if (!can(ctx, action)) {
      return res.status(403).json({ ok: false, error: 'Forbidden', action });
    }

    (req as any).perm = { ctx };
    next();
  };
}