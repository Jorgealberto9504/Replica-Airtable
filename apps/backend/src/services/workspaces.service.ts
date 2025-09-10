// apps/backend/src/services/workspaces.service.ts
import { prisma } from './db.js';
import { Prisma } from '@prisma/client';

/** ========= Helpers de error (duplicados) ========= */
function rethrowConflictIfDuplicateWorkspace(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const err: any = new Error('Unique constraint violation');
    err.status = 409;
    err.body = {
      error: 'CONFLICT',
      detail: 'Duplicate workspace name for this owner', // (ownerId, name, isTrashed=false)
      code: 'P2002',
      meta: e.meta,
    };
    throw err;
  }
  throw e;
}

/** ========= CRUD Workspaces (activos) ========= */

/**
 * Crea un workspace (ownerId + name).
 * Unicidad típica: (ownerId, name, isTrashed=false) en el schema.
 */
export async function createWorkspace(input: { ownerId: number; name: string }) {
  try {
    return await prisma.workspace.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        // isTrashed=false por defecto según schema
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        isTrashed: true,
        trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateWorkspace(e);
  }
}

/** Lista mis workspaces activos (excluye papelera) */
export async function listMyWorkspaces(ownerId: number) {
  return prisma.workspace.findMany({
    where: { ownerId, isTrashed: false },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
    orderBy: { id: 'asc' },
  });
}

/** SYSADMIN: lista todos los workspaces activos (excluye papelera) */
export async function listAllWorkspacesForSysadmin() {
  return prisma.workspace.findMany({
    where: { isTrashed: false },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ ownerId: 'asc' }, { id: 'asc' }],
  });
}

/** Obtener workspace por id (excluye papelera por defecto) */
export async function getWorkspaceById(workspaceId: number) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, isTrashed: false },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
  });
}

/** Actualizar nombre (no permite si está en papelera) */
export async function updateWorkspace(workspaceId: number, patch: { name?: string }) {
  const current = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { isTrashed: true },
  });
  if (!current) {
    const err: any = new Error('Workspace no encontrado');
    err.status = 404;
    throw err;
  }
  if (current.isTrashed) {
    const err: any = new Error('No puedes actualizar un workspace en la papelera. Restaúralo primero.');
    err.status = 409;
    throw err;
  }

  try {
    return await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        isTrashed: true,
        trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateWorkspace(e);
  }
}

/** ========= Papelera Workspaces (con cascada bases+tablas) ========= */

/** Enviar workspace a papelera + cascada: bases y tablas a papelera */
export async function deleteWorkspace(workspaceId: number) {
  // 1) Marcar workspace en papelera
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { isTrashed: true, trashedAt: new Date() },
  });

  // 2) Cascada: bases del workspace a papelera
  await prisma.base.updateMany({
    where: { workspaceId, isTrashed: false },
    data: { isTrashed: true, trashedAt: new Date() },
  });

  // 3) Cascada: tablas de esas bases a papelera
  await prisma.tableDef.updateMany({
    where: { base: { workspaceId }, isTrashed: false },
    data: { isTrashed: true, trashedAt: new Date() },
  });
}

/** Listar workspaces en papelera del owner */
export async function listTrashedWorkspacesForOwner(ownerId: number) {
  return prisma.workspace.findMany({
    where: { ownerId, isTrashed: true },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
    orderBy: { trashedAt: 'desc' },
  });
}

/** ADMIN: listar papelera global de workspaces (opcional filtrado por ownerId) */
export async function listTrashedWorkspacesForAdmin(params?: { ownerId?: number }) {
  return prisma.workspace.findMany({
    where: {
      isTrashed: true,
      ...(params?.ownerId ? { ownerId: params.ownerId } : {}),
    },
    select: {
      id: true,
      name: true,
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

/** Restaurar workspace + cascada: bases y tablas */
export async function restoreWorkspace(
  workspaceId: number,
  actor: { userId: number; isSysadmin: boolean }
) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true, isTrashed: true },
  });
  if (!ws || !ws.isTrashed) {
    const err: any = new Error('Workspace no encontrado o no está en papelera');
    err.status = 404;
    throw err;
  }
  if (!actor.isSysadmin && actor.userId !== ws.ownerId) {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  // 1) Restaurar workspace
  const restored = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { isTrashed: false, trashedAt: null },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
  });

  // 2) Restaurar bases del workspace
  await prisma.base.updateMany({
    where: { workspaceId, isTrashed: true },
    data: { isTrashed: false, trashedAt: null },
  });

  // 3) Restaurar tablas de esas bases
  await prisma.tableDef.updateMany({
    where: { base: { workspaceId }, isTrashed: true },
    data: { isTrashed: false, trashedAt: null },
  });

  return restored;
}

/** Borrado definitivo de workspace (solo si está en papelera) */
export async function deleteWorkspacePermanently(
  workspaceId: number,
  actor: { userId: number; isSysadmin: boolean }
) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true, isTrashed: true },
  });
  if (!ws) {
    const err: any = new Error('Workspace no encontrado');
    err.status = 404;
    throw err;
  }
  if (!ws.isTrashed) {
    const err: any = new Error('El workspace no está en la papelera.');
    err.status = 400;
    throw err;
  }
  if (!actor.isSysadmin && actor.userId !== ws.ownerId) {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  await prisma.workspace.delete({ where: { id: workspaceId } }); // onDelete: Cascade en Base → elimina tablas
  return { ok: true };
}

/** Vaciar papelera del owner (workspaces) */
export async function emptyWorkspaceTrashForOwner(ownerId: number) {
  await prisma.workspace.deleteMany({
    where: { ownerId, isTrashed: true },
  });
}

/** Purga automática (≥ N días en papelera) */
export async function purgeTrashedWorkspacesOlderThan(days: number = 30) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.workspace.deleteMany({
    where: { isTrashed: true, trashedAt: { lte: threshold } },
  });
}