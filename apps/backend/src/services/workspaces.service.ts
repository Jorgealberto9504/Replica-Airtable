import { prisma, prismaDirect } from './db.js';
import { Prisma } from '@prisma/client';
import type { Prisma as P } from '@prisma/client';
import { restoreAllTablesForBaseInTx } from './tables.service.js';

/* ===================== Helpers ===================== */
function rethrowConflictIfDuplicateWorkspace(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const err: any = new Error('Unique constraint violation');
    err.status = 409;
    err.body = {
      ok: false,
      error: 'CONFLICT',
      detail: 'Duplicate name for this owner (active item already exists)',
      code: 'P2002',
      meta: e.meta,
    };
    throw err;
  }
  throw e;
}

function tsStamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**  Unicidad de Base por (ownerId, name, isTrashed=false)  */
async function makeUniqueBaseName(
  tx: P.TransactionClient,
  ownerId: number,
  original: string
): Promise<string> {
  const stamp = tsStamp();
  let candidate = `${original} (restored ${stamp})`;
  let n = 1;
  while (true) {
    const exists = await tx.base.findFirst({
      where: { ownerId, name: candidate, isTrashed: false },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${original} (restored ${stamp} #${n++})`;
  }
}

/**  Unicidad de Workspace por (ownerId, name, isTrashed=false)  */
async function makeUniqueWorkspaceName(
  tx: P.TransactionClient,
  ownerId: number,
  original: string
): Promise<string> {
  const stamp = tsStamp();
  let candidate = `${original} (restored ${stamp})`;
  let n = 1;
  while (true) {
    const exists = await tx.workspace.findFirst({
      where: { ownerId, name: candidate, isTrashed: false },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${original} (restored ${stamp} #${n++})`;
  }
}

/* ============ CRUD Workspaces (activos) ============ */
export async function createWorkspace(input: { ownerId: number; name: string }) {
  try {
    return await prisma.workspace.create({
      data: { ownerId: input.ownerId, name: input.name },
      select: {
        id: true, name: true, ownerId: true,
        createdAt: true, updatedAt: true,
        isTrashed: true, trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateWorkspace(e);
  }
}

export async function listMyWorkspaces(ownerId: number) {
  return prisma.workspace.findMany({
    where: { ownerId, isTrashed: false },
    select: {
      id: true, name: true, ownerId: true,
      createdAt: true, updatedAt: true,
      isTrashed: true, trashedAt: true,
    },
    orderBy: { id: 'asc' },
  });
}

export async function listAllWorkspacesForSysadmin() {
  return prisma.workspace.findMany({
    where: { isTrashed: false },
    select: {
      id: true, name: true, ownerId: true,
      createdAt: true, updatedAt: true,
      isTrashed: true, trashedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ ownerId: 'asc' }, { id: 'asc' }],
  });
}

export async function getWorkspaceById(workspaceId: number) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, isTrashed: false },
    select: {
      id: true, name: true, ownerId: true,
      createdAt: true, updatedAt: true,
      isTrashed: true, trashedAt: true,
    },
  });
}

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
      data: { ...(patch.name !== undefined ? { name: patch.name } : {}) },
      select: {
        id: true, name: true, ownerId: true,
        createdAt: true, updatedAt: true,
        isTrashed: true, trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateWorkspace(e);
  }
}

/* ======= Papelera Workspaces (cascada bases+tablas) ======= */
export async function deleteWorkspace(
  workspaceId: number,
  actor: { userId: number; isSysadmin: boolean }
) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true, isTrashed: true, name: true },
  });
  if (!ws) { const err: any = new Error('Workspace no encontrado'); err.status = 404; throw err; }
  if (!actor.isSysadmin && actor.userId !== ws.ownerId) {
    const err: any = new Error('FORBIDDEN'); err.status = 403; throw err;
  }
  if (ws.isTrashed) return;

  // 🔴 Usa cliente DIRECTO para evitar P2028 con PgBouncer
  await prismaDirect.$transaction(async (tx) => {
    try {
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { isTrashed: true, trashedAt: new Date() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const newName = `${ws.name} (deleted ${tsStamp()})`;
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { name: newName, isTrashed: true, trashedAt: new Date() },
        });
      } else {
        throw e;
      }
    }

    const bases = await tx.base.findMany({
      where: { workspaceId, isTrashed: false },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    for (const b of bases) {
      try {
        await tx.base.update({
          where: { id: b.id },
          data: { isTrashed: true, trashedAt: new Date() },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const newName = `${b.name} (deleted ${tsStamp()})`;
          await tx.base.update({
            where: { id: b.id },
            data: { name: newName, isTrashed: true, trashedAt: new Date() },
          });
        } else {
          throw e;
        }
      }

      await tx.tableDef.updateMany({
        where: { baseId: b.id, isTrashed: false },
        data: { isTrashed: true, trashedAt: new Date() },
      });
    }
  });
}

export async function listTrashedWorkspacesForOwner(ownerId: number) {
  return prisma.workspace.findMany({
    where: { ownerId, isTrashed: true },
    select: {
      id: true, name: true, ownerId: true,
      createdAt: true, updatedAt: true,
      isTrashed: true, trashedAt: true,
    },
    orderBy: { trashedAt: 'desc' },
  });
}

export async function listTrashedWorkspacesForAdmin(params?: { ownerId?: number }) {
  return prisma.workspace.findMany({
    where: { isTrashed: true, ...(params?.ownerId ? { ownerId: params.ownerId } : {}) },
    select: {
      id: true, name: true, ownerId: true,
      createdAt: true, updatedAt: true,
      isTrashed: true, trashedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ ownerId: 'asc' }, { trashedAt: 'desc' }],
  });
}

/**
 * Restaurar workspace + cascada con rename automático:
 * - Workspace: si duplica nombre activo ⇒ rename automático (ownerId).
 * - Bases: si duplican nombre activo ⇒ rename automático (ownerId).
 * - Tablas: reordena posiciones 1..N con el mismo `tx`.
 */
export async function restoreWorkspace(
  workspaceId: number,
  actor: { userId: number; isSysadmin: boolean }
) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true, isTrashed: true, name: true },
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

  try {
    // 🔴 Usa cliente DIRECTO para evitar P2028 con PgBouncer
    return await prismaDirect.$transaction(async (tx) => {
      // 1) Restaurar workspace (rename si hay conflicto P2002)
      let restoredWs: {
        id: number;
        name: string;
        ownerId: number;
        createdAt: Date;
        updatedAt: Date;
        isTrashed: boolean;
        trashedAt: Date | null;
      };

      try {
        restoredWs = await tx.workspace.update({
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
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const newName = await makeUniqueWorkspaceName(tx, ws.ownerId, ws.name);
          restoredWs = await tx.workspace.update({
            where: { id: workspaceId },
            data: { name: newName, isTrashed: false, trashedAt: null },
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
        } else {
          throw e;
        }
      }

      // 2) Restaurar bases (rename auto si hay conflicto por ownerId)
      const toRestore = await tx.base.findMany({
        where: { workspaceId, isTrashed: true },
        select: { id: true, name: true, ownerId: true },
        orderBy: { trashedAt: 'asc' },
      });

      for (const b of toRestore) {
        try {
          await tx.base.update({
            where: { id: b.id },
            data: { isTrashed: false, trashedAt: null },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            const newName = await makeUniqueBaseName(tx, b.ownerId, b.name);
            await tx.base.update({
              where: { id: b.id },
              data: { name: newName, isTrashed: false, trashedAt: null },
            });
          } else {
            throw e;
          }
        }

        // 3) Reordenar tablas a 1..N dentro del mismo tx
        await restoreAllTablesForBaseInTx(tx, b.id);
      }

      // Devuelve el workspace restaurado sin lecturas extra
      return restoredWs;
    });
  } catch (e) {
    rethrowConflictIfDuplicateWorkspace(e);
  }
}

export async function deleteWorkspacePermanently(
  workspaceId: number,
  actor: { userId: number; isSysadmin: boolean }
) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true, isTrashed: true },
  });
  if (!ws) { const err: any = new Error('Workspace no encontrado'); err.status = 404; throw err; }
  if (!ws.isTrashed) { const err: any = new Error('El workspace no está en la papelera.'); err.status = 400; throw err; }
  if (!actor.isSysadmin && actor.userId !== ws.ownerId) {
    const err: any = new Error('FORBIDDEN'); err.status = 403; throw err;
  }
  await prisma.workspace.delete({ where: { id: workspaceId } });
  return { ok: true };
}

export async function emptyWorkspaceTrashForOwner(ownerId: number) {
  await prisma.workspace.deleteMany({ where: { ownerId, isTrashed: true } });
}

export async function purgeTrashedWorkspacesOlderThan(days: number = 30) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.workspace.deleteMany({
    where: { isTrashed: true, trashedAt: { lte: threshold } },
  });
}