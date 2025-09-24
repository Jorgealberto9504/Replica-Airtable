import { prisma, prismaDirect } from './db.js';
import { Prisma } from '@prisma/client';
import type { Prisma as P } from '@prisma/client';

/** Helper para detectar violación de unique (baseId, name, isTrashed=false) */
export function isDuplicateTableNameError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

// Mapear duplicados a HTTP 409
function rethrowConflictIfDuplicateTable(e: unknown) {
  if (isDuplicateTableNameError(e)) {
    const err: any = new Error('Unique constraint violation');
    err.status = 409;
    err.body = {
      error: 'CONFLICT',
      detail: 'Duplicate table name within this base',
      code: 'P2002',
      meta: (e as Prisma.PrismaClientKnownRequestError).meta,
    };
    throw err;
  }
  throw e;
}

/* ======================================================
   Bloquear CRUD si la BASE está en papelera
   ====================================================== */
async function ensureBaseActive(baseId: number) {
  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { isTrashed: true },
  });
  if (!base) {
    const err: any = new Error('Base no encontrada');
    err.status = 404;
    throw err;
  }
  if (base.isTrashed) {
    const err: any = new Error('La base está en la papelera. Restaúrala primero.');
    err.status = 409;
    throw err;
  }
}

/* ==========================================
   util para calcular siguiente posición
   ========================================== */
async function getNextPosition(baseId: number): Promise<number> {
  const agg = await prisma.tableDef.aggregate({
    where: { baseId, isTrashed: false },
    _max: { position: true },
  });
  const maxPos = agg._max.position ?? 0;
  return maxPos + 1;
}

/* ==========================================
   T6.9: helpers de resolución/metadata
   ========================================== */
export async function getDefaultTableIdForBase(baseId: number): Promise<number | null> {
  await ensureBaseActive(baseId);
  const row = await prisma.tableDef.findFirst({
    where: { baseId, isTrashed: false },
    select: { id: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  return row?.id ?? null;
}

export async function countActiveTablesForBase(baseId: number): Promise<number> {
  await ensureBaseActive(baseId);
  return prisma.tableDef.count({ where: { baseId, isTrashed: false } });
}

/** (mock mínimo de columnas para el grid) */
export async function getGridMetaForTable(baseId: number, tableId: number) {
  await ensureBaseActive(baseId);

  const tbl = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true },
  });
  if (!tbl || tbl.baseId !== baseId || tbl.isTrashed) {
    const err: any = new Error('Tabla no encontrada');
    err.status = 404;
    throw err;
  }

  const columns = [
    { id: 'name',      key: 'name',      label: 'Nombre',       type: 'TEXT',     width: 220, position: 1 },
    { id: 'createdAt', key: 'createdAt', label: 'Creado',       type: 'DATETIME', width: 160, position: 2 },
    { id: 'updatedAt', key: 'updatedAt', label: 'Actualizado',  type: 'DATETIME', width: 160, position: 3 },
  ];

  return { columns };
}

/* ==========================================
   CRUD de tablas
   ========================================== */
export async function createTable(baseId: number, name: string) {
  await ensureBaseActive(baseId);
  try {
    const position = await getNextPosition(baseId);
    return await prisma.tableDef.create({
      data: { baseId, name, position },
      select: {
        id: true, baseId: true, name: true, position: true,
        createdAt: true, updatedAt: true, isTrashed: true, trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateTable(e);
  }
}

export async function listTablesForBase(baseId: number) {
  await ensureBaseActive(baseId);
  return prisma.tableDef.findMany({
    where: { baseId, isTrashed: false },
    select: {
      id: true, baseId: true, name: true, position: true,
      createdAt: true, updatedAt: true, isTrashed: true, trashedAt: true,
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
}

/** listado ligero para barra */
export async function listTablesNavForBase(baseId: number) {
  await ensureBaseActive(baseId);
  return prisma.tableDef.findMany({
    where: { baseId, isTrashed: false },
    select: { id: true, name: true, position: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
}

export async function getTableById(baseId: number, tableId: number) {
  await ensureBaseActive(baseId);
  const tbl = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: {
      id: true, baseId: true, name: true, position: true,
      createdAt: true, updatedAt: true, isTrashed: true,
    },
  });
  return (tbl && tbl.baseId === baseId && !tbl.isTrashed) ? tbl : null;
}

export async function updateTable(baseId: number, tableId: number, patch: { name?: string }) {
  await ensureBaseActive(baseId);
  const existing = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true },
  });
  if (!existing || existing.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada');
    err.code = 'P2025';
    err.status = 404;
    throw err;
  }
  if (existing.isTrashed) {
    const err: any = new Error('No puedes actualizar una tabla en la papelera. Restaúrala primero.');
    err.status = 409;
    throw err;
  }

  try {
    return await prisma.tableDef.update({
      where: { id: tableId },
      data: { ...(patch.name !== undefined ? { name: patch.name } : {}) },
      select: {
        id: true, baseId: true, name: true, position: true,
        createdAt: true, updatedAt: true, isTrashed: true, trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateTable(e);
  }
}

/* Reordenamiento (drag & drop) */
export async function reorderTables(baseId: number, orderedIds: number[]) {
  await ensureBaseActive(baseId);

  const current = await prisma.tableDef.findMany({
    where: { baseId, isTrashed: false },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const currentIds = current.map((t) => t.id);
  const uniqueOrdered = Array.from(new Set(orderedIds));

  if (uniqueOrdered.length !== orderedIds.length) {
    const err: any = new Error('orderedIds contiene ids repetidos'); err.status = 400; throw err;
  }
  if (uniqueOrdered.length !== currentIds.length) {
    const err: any = new Error('orderedIds no coincide con la cantidad de tablas activas'); err.status = 400; throw err;
  }
  const currentSet = new Set(currentIds);
  for (const id of uniqueOrdered) {
    if (!currentSet.has(id)) {
      const err: any = new Error(`La tabla ${id} no pertenece a esta base o no está activa`); err.status = 400; throw err;
    }
  }

  await prisma.$transaction(
    uniqueOrdered.map((id, idx) =>
      prisma.tableDef.update({ where: { id }, data: { position: idx + 1 } })
    )
  );

  return { ok: true };
}

/* SOFT DELETE */
export async function deleteTable(baseId: number, tableId: number) {
  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { isTrashed: true },
  });
  if (!base) { const err: any = new Error('Base no encontrada'); err.status = 404; throw err; }
  if (base.isTrashed) return;

  const existing = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true },
  });
  if (!existing || existing.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada'); err.code = 'P2025'; err.status = 404; throw err;
  }
  if (existing.isTrashed) return;

  await prisma.tableDef.update({
    where: { id: tableId },
    data: { isTrashed: true, trashedAt: new Date() },
  });
}

/* ===========================
   Papelera (OWNER)
   =========================== */
export async function listTrashedTablesForBase(baseId: number) {
  await ensureBaseActive(baseId);
  return prisma.tableDef.findMany({
    where: { baseId, isTrashed: true },
    select: {
      id: true, baseId: true, name: true, position: true,
      createdAt: true, updatedAt: true, isTrashed: true, trashedAt: true,
    },
    orderBy: { trashedAt: 'desc' },
  });
}

/* ===========================
   Papelera (ADMIN / GLOBAL)
   =========================== */
export async function listTrashedTablesForAdmin(params?: { ownerId?: number; baseId?: number }) {
  return prisma.tableDef.findMany({
    where: {
      isTrashed: true,
      ...(params?.baseId ? { baseId: params.baseId } : {}),
      base: {
        is: {
          isTrashed: false,
          ...(params?.ownerId ? { ownerId: params.ownerId } : {}),
        },
      },
    },
    select: {
      id: true,
      baseId: true,
      name: true,
      position: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
      base: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    orderBy: [{ baseId: 'asc' }, { trashedAt: 'desc' }],
  });
}

/** Restaurar una tabla específica desde papelera */
export async function restoreTable(baseId: number, tableId: number) {
  const tbl = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true },
  });
  if (!tbl || tbl.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada'); err.status = 404; throw err;
  }
  if (!tbl.isTrashed) {
    const err: any = new Error('La tabla no está en la papelera.'); err.status = 400; throw err;
  }

  try {
    const newPos = await getNextPosition(baseId);
    return await prisma.tableDef.update({
      where: { id: tableId },
      data: { isTrashed: false, trashedAt: null, position: newPos },
      select: {
        id: true, baseId: true, name: true, position: true,
        createdAt: true, updatedAt: true, isTrashed: true, trashedAt: true,
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateTable(e);
  }
}

/** Borrado definitivo de una tabla (solo si está en papelera) */
export async function deleteTablePermanently(baseId: number, tableId: number) {
  const tbl = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true },
  });
  if (!tbl || tbl.baseId !== baseId) { const err: any = new Error('Tabla no encontrada'); err.status = 404; throw err; }
  if (!tbl.isTrashed) { const err: any = new Error('La tabla no está en la papelera.'); err.status = 400; throw err; }
  await prisma.tableDef.delete({ where: { id: tableId } });
}

/** Vaciar papelera de una base (borrado definitivo) */
export async function emptyTrashForBase(baseId: number) {
  await prisma.tableDef.deleteMany({ where: { baseId, isTrashed: true } });
}

/** Purga automática (≥ N días) */
export async function purgeTrashedTablesOlderThan(days: number = 30) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.tableDef.deleteMany({
    where: { isTrashed: true, trashedAt: { lte: threshold } },
  });
}

/* ===== Helpers para rename de tablas al restaurar ===== */
async function makeUniqueTableName(
  tx: P.TransactionClient,
  baseId: number,
  original: string
): Promise<string> {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let candidate = `${original} (restored ${stamp})`;
  let n = 1;
  while (true) {
    const exists = await tx.tableDef.findFirst({
      where: { baseId, name: candidate, isTrashed: false },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${original} (restored ${stamp} #${n++})`;
  }
}

/* ======================================================
   Restaurar TODAS las tablas al restaurar la base (TRANSACCIONAL)
   ====================================================== */
export async function restoreAllTablesForBaseInTx(
  tx: P.TransactionClient,
  baseId: number
) {
  // 1) posición inicial (continuar al final)
  const agg = await tx.tableDef.aggregate({
    where: { baseId, isTrashed: false },
    _max: { position: true },
  });
  let nextPos = (agg._max.position ?? 0) + 1;

  // 2) tablas en papelera (orden estable)
  const trashed = await tx.tableDef.findMany({
    where: { baseId, isTrashed: true },
    select: { id: true, name: true },
    orderBy: [{ trashedAt: 'asc' }, { id: 'asc' }],
  });

  // 3) restaurar con posición y rename si hay conflicto
  for (const t of trashed) {
    try {
      await tx.tableDef.update({
        where: { id: t.id },
        data: { isTrashed: false, trashedAt: null, position: nextPos++ },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const newName = await makeUniqueTableName(tx, baseId, t.name);
        await tx.tableDef.update({
          where: { id: t.id },
          data: { name: newName, isTrashed: false, trashedAt: null, position: nextPos++ },
        });
      } else {
        throw e;
      }
    }
  }

  // 4) normalizar posiciones 1..N
  const final = await tx.tableDef.findMany({
    where: { baseId, isTrashed: false },
    select: { id: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  let i = 0;
  for (const t of final) {
    i += 1;
    await tx.tableDef.update({ where: { id: t.id }, data: { position: i } });
  }
}

/** Versión no-transaccional (por si se necesita en un script aislado) */
export async function restoreAllTablesForBase(baseId: number) {
  return prismaDirect.$transaction(async (tx) => {
    await restoreAllTablesForBaseInTx(tx, baseId);
  });
}