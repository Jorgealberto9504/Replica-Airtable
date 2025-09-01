// apps/backend/src/permissions/types.ts

import type { BaseRole, PlatformRole } from '@prisma/client'; // Tipos generados por Prisma para roles globales y por base

// === Acciones del sistema
export type Action =
  | 'records:read'            // Leer/listar registros dentro de una base
  | 'records:create'          // Crear registros
  | 'records:update'          // Editar registros
  | 'records:delete'          // Borrar registros
  | 'base:view'               // Ver/entrar a una base concreta (habilita navegación básica)
  | 'comments:create'         // Agregar comentarios
  | 'schema:manage'           // Gestionar esquema: columnas/tablas/tipos
  | 'members:manage'          // Invitar/quitar miembros y cambiar sus roles en un base
  | 'base:delete'             // Borrar la base completa
  | 'base:visibility'         // Cambiar PUBLIC/PRIVATE de la base
  | 'bases:create'            // (GLOBAL) Crear nuevas bases en la plataforma
  | 'platform:users:manage';  // (GLOBAL) Administrar usuarios (solo SYSADMIN)

// === Contexto mínimo para decidir permisos en una petición
export type PermissionContext = {
  userId: number;                         // ID del usuario autenticado (actor)
  platformRole: PlatformRole;             // 'USER' | 'SYSADMIN' (rol global)
  canCreateBases: boolean;                // Flag global: ¿puede crear bases aunque no sea SYSADMIN?

  baseId: number;                         // ID de la base objetivo de la acción
  baseVisibility: 'PUBLIC' | 'PRIVATE';   // Visibilidad actual de la base

  isOwner: boolean;                       // ¿El usuario es dueño (ownerId === userId)?
  membershipRole?: BaseRole | null;       // Rol del usuario en esa base: 'EDITOR' | 'COMMENTER' | 'VIEWER' | null si no es miembro
};

// === Ranking de roles por base (para comparaciones rápidas) ===
const BASE_ROLE_RANK: Record<BaseRole, number> = {
  EDITOR: 3,      // Mayor poder dentro de los roles por base (puede CUD de registros)
  COMMENTER: 2,   // Puede comentar (y típicamente leer)
  VIEWER: 1,      // Solo lectura
};

// Helper: ¿a es al menos b? (ej. EDITOR >= VIEWER)
export function isRoleAtLeast(a: BaseRole, b: BaseRole): boolean {
  return BASE_ROLE_RANK[a] >= BASE_ROLE_RANK[b]; // Compara por ranking numérico
}

// Helper: ¿es SYSADMIN global?
export function isSysadmin(ctx: Pick<PermissionContext, 'platformRole'>): boolean {
  return ctx.platformRole === 'SYSADMIN'; // TRUE si el rol global es SYSADMIN
}

// Rol efectivo del usuario dentro de la base (para checks de lectura/escritura rápidos)
// Reglas:
//  - SYSADMIN ⇒ al menos 'EDITOR' (puede operar registros)
//  - Owner    ⇒ al menos 'EDITOR'
//  - Si es miembro ⇒ su membershipRole
//  - Si NO es miembro y la base es PUBLIC ⇒ 'VIEWER'
//  - Si es PRIVATE y no es miembro ⇒ undefined (sin acceso)
export function resolveEffectiveBaseRole(
  ctx: PermissionContext
): BaseRole | undefined {
  if (isSysadmin(ctx)) return 'EDITOR';                // SYSADMIN: full para registros
  if (ctx.isOwner) return 'EDITOR';                    // Dueño: full para registros
  if (ctx.membershipRole) return ctx.membershipRole;   // Usa su rol de membership
  if (ctx.baseVisibility === 'PUBLIC') return 'VIEWER';// Público sin membership: al menos lectura
  return undefined;                                     // Privado sin membership: sin acceso
}