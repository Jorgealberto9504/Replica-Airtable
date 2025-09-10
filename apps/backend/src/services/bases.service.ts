// apps/backend/src/services/bases.service.ts
import { prisma } from './db.js';
import type { BaseVisibility } from '@prisma/client';
import { Prisma } from '@prisma/client'; // NUEVO T6.4: detectar P2002 (violación de unique)

// NUEVO T6.4: helper local para mapear duplicados a HTTP 409
function rethrowConflictIfDuplicateBase(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const err: any = new Error('Unique constraint violation');
    err.status = 409;
    err.body = {
      error: 'CONFLICT',
      detail: 'Duplicate base name for this owner', // (ownerId, name, isTrashed=false)
      code: 'P2002',
      meta: e.meta, // opcional: Prisma meta con campos
    };
    throw err;
  }
  throw e;
}

/* ==================================================================
   === NUEVO WORKSPACES: helpers internos para validar workspace  ===
   ================================================================== */

/**
 * Verifica que el workspace exista, NO esté en papelera y pertenezca al owner dado.
 * Lanza 404 si no existe o está en papelera; 403 si el owner no coincide.
 */
async function assertWorkspaceActiveAndOwned(workspaceId: number, ownerId: number) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true, isTrashed: true },
  });
  if (!ws || ws.isTrashed) {
    const err: any = new Error('Workspace no encontrado');
    err.status = 404;
    throw err;
  }
  if (ws.ownerId !== ownerId) {
    const err: any = new Error('FORBIDDEN: El workspace pertenece a otro owner');
    err.status = 403;
    throw err;
  }
  return ws;
}

/* ===========================
   CREAR BASE (general)
   =========================== */
export async function createBase(input: {
  ownerId: number;
  name: string;
  visibility: BaseVisibility;
}) {
  try {
    return await prisma.base.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        visibility: input.visibility,
        // Papelera: isTrashed=false por defecto (definido en schema)
      },
      select: {
        id: true,
        name: true,
        visibility: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        isTrashed: true,  // Papelera
        trashedAt: true,  // Papelera
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateBase(e);
  }
}

/* ================================================================
   === NUEVO WORKSPACES: crear base dentro de un workspace dado ===
   ================================================================ */
/**
 * Crea una base **dentro de un workspace**.
 * Requisitos:
 *  - El workspace debe existir, no estar en papelera y pertenecer al mismo owner.
 *  - Unicidad a nivel owner sigue vigente (ownerId, name, isTrashed=false).
 */
export async function createBaseInWorkspace(input: {
  ownerId: number;
  workspaceId: number;
  name: string;
  visibility: BaseVisibility;
}) {
  // Validar workspace (propiedad + activo)
  await assertWorkspaceActiveAndOwned(input.workspaceId, input.ownerId);

  try {
    return await prisma.base.create({
      data: {
        ownerId: input.ownerId,
        workspaceId: input.workspaceId,         // === NUEVO WORKSPACES ===
        name: input.name,
        visibility: input.visibility,
      },
      select: {
        id: true,
        name: true,
        visibility: true,
        ownerId: true,
        workspaceId: true,                       // === NUEVO WORKSPACES ===
        createdAt: true,
        updatedAt: true,
        isTrashed: true,
        trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateBase(e);
  }
}

/**
 * Lista todas las bases a las que el usuario TIENE acceso:
 * - Públicas (visibility=PUBLIC)
 * - Donde es dueño
 * - Donde es miembro
 * - EXCLUYE papelera
 */
export async function listAccessibleBasesForUser(userId: number) {
  const bases = await prisma.base.findMany({
    where: {
      isTrashed: false, // Papelera: excluir papelera
      OR: [
        { visibility: 'PUBLIC' },
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      workspaceId: true,            // === NUEVO WORKSPACES ===
      createdAt: true,
      updatedAt: true,
      isTrashed: true,  // Papelera
      trashedAt: true,  // Papelera
      owner: { select: { id: true, fullName: true, email: true } },
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  return bases.map((b) => ({
    ...b,
    membershipRole: b.members[0]?.role ?? null,
    members: undefined as any,
  }));
}

/* ===========================================================================
   === NUEVO WORKSPACES: listar bases activas por workspace (con permisos) ===
   ===========================================================================
   - Si isSysadmin=true: devuelve TODAS las bases activas del workspace.
   - Si isSysadmin=false: aplica la misma lógica de accesibilidad que listAccessibleBasesForUser
     pero filtrando por workspaceId.
*/
export async function listBasesForWorkspace(
  workspaceId: number,
  viewerUserId: number,
  opts?: { isSysadmin?: boolean }
) {
  const isSysadmin = !!opts?.isSysadmin;

  // 👇 Tipamos explícitamente como BaseWhereInput
  const where: Prisma.BaseWhereInput = isSysadmin
    ? {
        workspaceId,
        isTrashed: false,
      }
    : {
        workspaceId,
        isTrashed: false,
        OR: [
          { visibility: 'PUBLIC' },
          { ownerId: viewerUserId },
          { members: { some: { userId: viewerUserId } } },
        ],
      };

  return prisma.base.findMany({
    where,
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
    orderBy: { id: 'asc' },
  });
}

/**
 * SYSADMIN: lista TODAS las bases (públicas y privadas).
 * EXCLUYE papelera (la papelera tendrá su endpoint propio).
 */
export async function listAllBasesForSysadmin(viewerUserId: number) {
  const bases = await prisma.base.findMany({
    where: { isTrashed: false }, // Papelera
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      workspaceId: true,           // === NUEVO WORKSPACES ===
      createdAt: true,
      updatedAt: true,
      isTrashed: true,  // Papelera
      trashedAt: true,  // Papelera
      owner: { select: { id: true, fullName: true, email: true } },
      members: {
        where: { userId: viewerUserId },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  return bases.map((b) => ({
    ...b,
    membershipRole: b.members[0]?.role ?? null,
    members: undefined as any,
  }));
}

export async function getBaseById(baseId: number) {
  // Papelera: por defecto solo retornamos si NO está en papelera
  return prisma.base.findFirst({
    where: { id: baseId, isTrashed: false }, // (antes findUnique sin filtro)
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      workspaceId: true,           // === NUEVO WORKSPACES ===
      createdAt: true,
      updatedAt: true,
      isTrashed: true,  // Papelera
      trashedAt: true,  // Papelera
      owner: { select: { id: true, fullName: true, email: true } },
    },
  });
}

export async function updateBase(
  baseId: number,
  patch: { name?: string; visibility?: BaseVisibility }
) {
  // Papelera: impedir actualizar si está en papelera (estado inválido)
  const current = await prisma.base.findUnique({
    where: { id: baseId },
    select: { isTrashed: true },
  });
  if (!current) {
    const err: any = new Error('Base no encontrada');
    err.status = 404;
    throw err;
  }
  if (current.isTrashed) {
    const err: any = new Error('No puedes actualizar una base en la papelera. Restaúrala primero.');
    err.status = 409; // conflicto de estado
    throw err;
  }

  try {
    return await prisma.base.update({
      where: { id: baseId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
      },
      select: {
        id: true,
        name: true,
        visibility: true,
        ownerId: true,
        workspaceId: true,          // === NUEVO WORKSPACES ===
        createdAt: true,
        updatedAt: true,
        isTrashed: true,  // Papelera
        trashedAt: true,  // Papelera
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateBase(e);
  }
}

/* =============================================================================
   === NUEVO WORKSPACES: mover base entre workspaces (mismo owner) ============
   =============================================================================
   - Solo permitido si:
     * actor.isSysadmin = true, y ADEMÁS el workspace destino pertenece al mismo owner
       (no transferimos ownership aquí), o
     * actor es el owner y el workspace destino también es suyo.
   - No permite mover una base en papelera (estado inválido).
*/
export async function moveBaseToWorkspace(
  baseId: number,
  newWorkspaceId: number,
  actor: { userId: number; isSysadmin: boolean }
) {
  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { id: true, ownerId: true, isTrashed: true },
  });
  if (!base) {
    const err: any = new Error('Base no encontrada');
    err.status = 404;
    throw err;
  }
  if (base.isTrashed) {
    const err: any = new Error('No puedes mover una base en la papelera. Restaúrala primero.');
    err.status = 409;
    throw err;
  }

  // Validar workspace destino y propiedad
  const ws = await prisma.workspace.findUnique({
    where: { id: newWorkspaceId },
    select: { id: true, ownerId: true, isTrashed: true },
  });
  if (!ws || ws.isTrashed) {
    const err: any = new Error('Workspace destino no encontrado');
    err.status = 404;
    throw err;
  }

  // En esta versión NO transferimos ownership: debe coincidir el owner.
  if (ws.ownerId !== base.ownerId) {
    const err: any = new Error('No puedes mover la base a un workspace de otro owner');
    err.status = 409;
    throw err;
  }

  // Autorización básica (propietario o sysadmin)
  if (!actor.isSysadmin && actor.userId !== base.ownerId) {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  return prisma.base.update({
    where: { id: baseId },
    data: { workspaceId: newWorkspaceId },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
  });
}

/** SOFT DELETE: mover a papelera (no borramos) + cascada a tablas */
export async function deleteBase(baseId: number) {
  // 1) Marcar la BASE como en papelera
  try {
    await prisma.base.update({
      where: { id: baseId },
      data: { isTrashed: true, trashedAt: new Date() }, // <-- NUEVO: Papelera
    });
  } catch (e) {
    // (opcional) rename de cortesía si tienes índices estrictos
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const current = await prisma.base.findUnique({
        where: { id: baseId },
        select: { name: true },
      });
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      await prisma.base.update({
        where: { id: baseId },
        data: {
          name: `${current?.name ?? 'Base'} (deleted ${stamp})`,
          isTrashed: true,
          trashedAt: new Date(),
        },
      });
    } else {
      throw e;
    }
  }

  // 2) <-- NUEVO: CASCADA → mover TODAS SUS TABLAS a papelera
  await prisma.tableDef.updateMany({
    where: { baseId, isTrashed: false },
    data: { isTrashed: true, trashedAt: new Date() },
  });
}

/* ===========================
   Papelera: utilidades (OWNER)
   =========================== */

/** Listar bases en papelera (solo del owner) */
export async function listTrashedBasesForOwner(ownerId: number) {
  return prisma.base.findMany({
    where: { ownerId, isTrashed: true },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
    orderBy: { trashedAt: 'desc' },
  });
}

/* ====================================
   ADMIN: listar papelera GLOBAL (ya tenías)
   ==================================== */
export async function listTrashedBasesForAdmin(params?: { ownerId?: number }) {
  return prisma.base.findMany({
    where: {
      isTrashed: true,
      ...(params?.ownerId ? { ownerId: params.ownerId } : {}),
    },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ ownerId: 'asc' }, { trashedAt: 'desc' }],
  });
}

/* =========================================================
   Restaurar una base (OWNER o SYSADMIN) — con cascada
   ========================================================= */
export async function restoreBase(
  baseId: number,
  ownerIdOrActor: number | { userId: number; isSysadmin: boolean }
) {
  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { id: true, ownerId: true, name: true, isTrashed: true },
  });
  if (!base || !base.isTrashed) {
    const err: any = new Error('Base no encontrada o no está en papelera');
    err.status = 404;
    throw err;
  }

  const isAllowed =
    typeof ownerIdOrActor === 'number'
      ? base.ownerId === ownerIdOrActor
      : ownerIdOrActor.isSysadmin || base.ownerId === ownerIdOrActor.userId;

  if (!isAllowed) {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  try {
    // 1) Restaurar BASE
    const restored = await prisma.base.update({
      where: { id: baseId },
      data: { isTrashed: false, trashedAt: null }, // <-- NUEVO: restauración
      select: {
        id: true,
        name: true,
        visibility: true,
        ownerId: true,
        workspaceId: true, // === NUEVO WORKSPACES ===
        createdAt: true,
        updatedAt: true,
        isTrashed: true,
        trashedAt: true,
      },
    });

    // 2) <-- NUEVO: CASCADA → restaurar TODAS SUS TABLAS
    await prisma.tableDef.updateMany({
      where: { baseId, isTrashed: true },
      data: { isTrashed: false, trashedAt: null },
    });

    return restored;
  } catch (e) {
    rethrowConflictIfDuplicateBase(e);
  }
}

/* =================================================================
   Borrado definitivo (OWNER o SYSADMIN) — compatibilidad hacia atrás
   ================================================================= */
export async function deleteBasePermanently(
  baseId: number,
  ownerIdOrActor: number | { userId: number; isSysadmin: boolean }
) {
  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { ownerId: true, isTrashed: true },
  });
  if (!base) {
    const err: any = new Error('Base no encontrada');
    err.status = 404;
    throw err;
  }
  if (!base.isTrashed) {
    const err: any = new Error('La base no está en la papelera.');
    err.status = 400;
    throw err;
  }

  const isAllowed =
    typeof ownerIdOrActor === 'number'
      ? base.ownerId === ownerIdOrActor
      : ownerIdOrActor.isSysadmin || base.ownerId === ownerIdOrActor.userId;

  if (!isAllowed) {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  await prisma.base.delete({ where: { id: baseId } }); // onDelete: Cascade → elimina tablas
  return { ok: true };
}

/** Vaciar papelera del owner (borrado definitivo de todas) */
export async function emptyTrashForOwner(ownerId: number) {
  await prisma.base.deleteMany({
    where: { ownerId, isTrashed: true },
  });
}

/** Purga automática (≥ N días en papelera) */
export async function purgeTrashedBasesOlderThan(days: number = 30) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.base.deleteMany({
    where: {
      isTrashed: true,
      trashedAt: { lte: threshold },
    },
  });
}

