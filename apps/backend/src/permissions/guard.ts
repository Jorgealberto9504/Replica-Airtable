// apps/backend/src/permissions/guard.ts
import type { Request, Response, NextFunction } from 'express';
import { buildPermissionContext } from './context.js';
import { can } from './rules.js';
import type { Action } from './types.js';
import { getAuthUser } from '../middlewares/auth.middleware.js';

// ========================
// NUEVO T6.4: mensajes 403
// ========================
const FORBIDDEN_MESSAGES: Record<Action, string> = {
  'schema:manage'         : 'No tienes permisos para administrar el esquema de esta base.',
  'members:manage'        : 'No puedes administrar miembros de esta base.',
  'base:delete'           : 'No puedes eliminar esta base.',
  'base:visibility'       : 'No puedes cambiar la visibilidad de esta base.',
  'base:view'             : 'No tienes permisos para ver esta base.',
  'bases:create'          : 'No tienes permiso para crear bases.',
  'platform:users:manage' : 'No tienes permiso para administrar usuarios.',
  'records:read'          : 'No tienes permisos para ver registros.',
  'records:create'        : 'No tienes permisos para crear registros.',
  'records:update'        : 'No tienes permisos para actualizar registros.',
  'records:delete'        : 'No tienes permisos para eliminar registros.',
  'comments:create'       : 'No tienes permisos para comentar.',
};

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
        // ==========================
        // NUEVO T6.4: 404 opcional
        // ==========================
        // Si es una base PRIVADA y el usuario no es owner ni miembro,
        // puedes devolver 404 en vez de 403 para no filtrar su existencia.
        if (
          action === 'base:view' &&
          ctx.baseVisibility === 'PRIVATE' &&
          !ctx.isOwner &&
          !ctx.membershipRole
        ) {
          return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        }

        // ==========================
        // NUEVO T6.4: 403 enriquecido
        // ==========================
        return res.status(403).json({
          ok: false,
          error: 'FORBIDDEN',
          action,
          baseId,
          message: FORBIDDEN_MESSAGES[action] ?? 'Acceso no autorizado.',
        });
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
      // ==========================
      // NUEVO T6.4: 403 enriquecido
      // ==========================
      return res.status(403).json({
        ok: false,
        error: 'FORBIDDEN',
        action,
        message: FORBIDDEN_MESSAGES[action] ?? 'Acceso no autorizado.',
      });
    }

    (req as any).perm = { ctx };
    next();
  };
}