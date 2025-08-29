// apps/backend/src/permissions/rules.ts
// Motor de autorización: can(ctx, action) => true/false

import type { BaseRole } from '@prisma/client';
import {
  type Action,
  type PermissionContext,
  isSysadmin,
  resolveEffectiveBaseRole,
  isRoleAtLeast,
} from './types.js';

/**
 * Reglas de negocio:
 * - SYSADMIN: puede TODO (plataforma + cualquier base).
 * - Plataforma:
 *   - 'bases:create': permitido si canCreateBases=true o es SYSADMIN.
 *   - 'platform:users:manage': sólo SYSADMIN.
 * - En una base concreta:
 *   - Owner: puede 'schema:manage' | 'members:manage' | 'base:delete' | 'base:visibility'.
 *   - 'base:view': público => cualquiera; privado => owner o miembro.
 *   - Registros:
 *       read      >= VIEWER
 *       comment   >= COMMENTER
 *       create/upd/del >= EDITOR
 *   - Si no hay rol efectivo (p.ej. privada sin membership) => denegar.
 */
export function can(ctx: PermissionContext, action: Action): boolean {
  // 0) SYSADMIN: barra libre
  if (isSysadmin(ctx)) {
    return true;
  }

  // 1) Acciones de plataforma (globales)
  if (action === 'bases:create') {
    return ctx.canCreateBases === true;
  }
  if (action === 'platform:users:manage') {
    return false; // sólo SYSADMIN (ya habríamos retornado true arriba si lo fuera)
  }


  // 2.1) Owner: poderes exclusivos de administración de la base
  if (
    ctx.isOwner &&
    (action === 'schema:manage' ||
      action === 'members:manage' ||
      action === 'base:delete' ||
      action === 'base:visibility')
  ) {
    return true;
  }

  // 2.2) Ver la base
  if (action === 'base:view') {
    if (ctx.baseVisibility === 'PUBLIC') return true;
    return ctx.isOwner || !!ctx.membershipRole; // privadas: dueño o miembro
  }

  // 2.3) Acciones de registros/comentarios: requieren rol efectivo
  const role = resolveEffectiveBaseRole(ctx);
  if (!role) return false; // sin acceso a la base

  switch (action) {
    case 'records:read':
      return atLeast(role, 'VIEWER');
    case 'comments:create':
      return atLeast(role, 'COMMENTER');
    case 'records:create':
    case 'records:update':
    case 'records:delete':
      return atLeast(role, 'EDITOR');

    // Si llega aquí con acciones de administración de base y NO es owner, denegar
    case 'schema:manage':
    case 'members:manage':
    case 'base:delete':
    case 'base:visibility':
      return false;

    default:
      // acción no contemplada (typo, etc.)
      return false;
  }
}

function atLeast(role: BaseRole, min: BaseRole): boolean {
  return isRoleAtLeast(role, min);
}