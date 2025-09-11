import { prisma } from './db.js';
import { Prisma } from '@prisma/client';

/** Helper para detectar violación de unique (baseId, name, isTrashed=false) */
export function isDuplicateTableNameError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

// NUEVO: helper para mapear duplicados de tabla a HTTP 409
function rethrowConflictIfDuplicateTable(e: unknown) {
  if (isDuplicateTableNameError(e)) {
    const err: any = new Error('Unique constraint violation');
    err.status = 409;
    err.body = {
      error: 'CONFLICT',
      detail: 'Duplicate table name within this base', // (baseId, name, isTrashed=false)
      code: 'P2002',
      meta: (e as Prisma.PrismaClientKnownRequestError).meta, // opcional
    };
    throw err;
  }
  throw e;
}

/* ======================================================
   <-- NUEVO: Bloquear CRUD si la BASE está en papelera -->
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
   NUEVO: util para calcular siguiente posición
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
   NUEVO T6.9: helpers de resolución/metadata
   ========================================== */

/** Devuelve el id de la primera tabla activa por `position` (o null si no hay). */
export async function getDefaultTableIdForBase(baseId: number): Promise<number | null> {
  await ensureBaseActive(baseId);
  const row = await prisma.tableDef.findFirst({
    where: { baseId, isTrashed: false },
    select: { id: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  return row?.id ?? null;
}

/** Cuenta tablas activas (no papelera) dentro de la base. */
export async function countActiveTablesForBase(baseId: number): Promise<number> {
  await ensureBaseActive(baseId);
  return prisma.tableDef.count({
    where: { baseId, isTrashed: false },
  });
}

/**
 * Crea una tabla dentro de una base.
 * - Unicidad aplica entre activas (isTrashed = false).
 * - NUEVO: asigna position consecutiva al final.
 */
export async function createTable(baseId: number, name: string) {
  await ensureBaseActive(baseId); // <-- NUEVO: bloquear si base está en papelera
  try {
    const position = await getNextPosition(baseId); // NUEVO
    return await prisma.tableDef.create({
      data: { baseId, name, position /* isTrashed=false por defecto */ },
      select: {
        id: true,
        baseId: true,
        name: true,
        position: true,  // NUEVO
        createdAt: true,
        updatedAt: true,
        isTrashed: true,  // Papelera
        trashedAt: true,  // Papelera
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateTable(e);
  }
}

/**
 * Lista todas las tablas de una base (EXCLUYE papelera).
 * Si la base está en papelera → 409.
 * Orden: por position (asc) y luego id (asc).
 */
export async function listTablesForBase(baseId: number) {
  await ensureBaseActive(baseId); // <-- NUEVO
  return prisma.tableDef.findMany({
    where: { baseId, isTrashed: false }, // Papelera
    select: {
      id: true,
      baseId: true,
      name: true,
      position: true,  // NUEVO
      createdAt: true,
      updatedAt: true,
      isTrashed: true,  // Papelera
      trashedAt: true,  // Papelera
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
}

/* ==========================================================
   NUEVO: listado ligero para barra de navegación de tablas
   ========================================================== */
/**
 * Lista mínima para la barra de tabs: id, name, position.
 * Ordena por position (asc) y luego id (asc).
 */
export async function listTablesNavForBase(baseId: number) {
  await ensureBaseActive(baseId);
  const rows = await prisma.tableDef.findMany({
    where: { baseId, isTrashed: false },
    select: { id: true, name: true, position: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });

  return rows;
}

/**
 * Obtiene una tabla por id dentro de una base.
 * EXCLUYE papelera y bloquea si la base está en papelera.
 */
export async function getTableById(baseId: number, tableId: number) {
  await ensureBaseActive(baseId); // <-- NUEVO
  const tbl = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      baseId: true,
      name: true,
      position: true,  // NUEVO
      createdAt: true,
      updatedAt: true,
      isTrashed: true,  // Papelera
    },
  });
  return (tbl && tbl.baseId === baseId && !tbl.isTrashed) ? tbl : null;
}

/**
 * Actualiza (por ahora sólo el nombre) de una tabla de la base.
 * No permite actualizar si la base o la tabla están en papelera.
 */
export async function updateTable(
  baseId: number,
  tableId: number,
  patch: { name?: string },
) {
  await ensureBaseActive(baseId); // <-- NUEVO
  // Verificamos pertenencia y estado de la tabla
  const existing = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true }, // Papelera
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
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
      },
      select: {
        id: true,
        baseId: true,
        name: true,
        position: true,  // NUEVO
        createdAt: true,
        updatedAt: true,
        isTrashed: true,  // Papelera
        trashedAt: true,  // Papelera
      },
    });
  } catch (e) {
    rethrowConflictIfDuplicateTable(e);
  }
}

/* ===========================================
   NUEVO: Reordenamiento de tablas (drag & drop)
   =========================================== */
/**
 * Reordena TODAS las tablas activas de una base según `orderedIds`.
 * - Valida que `orderedIds` contenga exactamente los ids activos de esa base.
 * - Asigna position = índice+1 para cada id.
 */
export async function reorderTables(baseId: number, orderedIds: number[]) {
  await ensureBaseActive(baseId);

  // Traer el conjunto actual de tablas activas
  const current = await prisma.tableDef.findMany({
    where: { baseId, isTrashed: false },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const currentIds = current.map((t) => t.id);
  const uniqueOrdered = Array.from(new Set(orderedIds));

  // Validaciones
  if (uniqueOrdered.length !== orderedIds.length) {
    const err: any = new Error('orderedIds contiene ids repetidos');
    err.status = 400;
    throw err;
  }
  if (uniqueOrdered.length !== currentIds.length) {
    const err: any = new Error('orderedIds no coincide con la cantidad de tablas activas');
    err.status = 400;
    throw err;
  }
  const currentSet = new Set(currentIds);
  for (const id of uniqueOrdered) {
    if (!currentSet.has(id)) {
      const err: any = new Error(`La tabla ${id} no pertenece a esta base o no está activa`);
      err.status = 400;
      throw err;
    }
  }

  // Actualizar posiciones en transacción
  await prisma.$transaction(
    uniqueOrdered.map((id, idx) =>
      prisma.tableDef.update({
        where: { id },
        data: { position: idx + 1 },
      })
    )
  );

  return { ok: true };
}

/**
 * SOFT DELETE: mueve la tabla a papelera (no borramos).
 * Si la base ya está en papelera, hacemos la operación idempotente (return).
 */
export async function deleteTable(baseId: number, tableId: number) {
  // Si la base está en papelera, evitar 409 y tratar como idempotente
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
    // probablemente ya quedaron en papelera por la cascada de base → tablas
    return; // <-- NUEVO: idempotente
  }

  // Verificamos pertenencia antes de "borrar".
  const existing = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true }, // Papelera
  });
  if (!existing || existing.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada');
    err.code = 'P2025';
    err.status = 404;
    throw err;
  }
  if (existing.isTrashed) {
    return; // ya en papelera → idempotente
  }

  await prisma.tableDef.update({
    where: { id: tableId },
    data: { isTrashed: true, trashedAt: new Date() }, // Papelera
  });
}

/* ===========================
   Papelera: utilidades (OWNER)
   =========================== */

/** Listar tablas en papelera de una base */
export async function listTrashedTablesForBase(baseId: number) {
  return prisma.tableDef.findMany({
    where: { baseId, isTrashed: true },
    select: {
      id: true,
      baseId: true,
      name: true,
      position: true, // NUEVO (por si el front quiere mostrar orden anterior)
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
    orderBy: { trashedAt: 'desc' },
  });
}

/** Papelera GLOBAL de tablas (SYSADMIN) */
export async function listTrashedTablesForAdmin(params?: { ownerId?: number; baseId?: number }) {
  return prisma.tableDef.findMany({
    where: {
      isTrashed: true,
      ...(params?.baseId ? { baseId: params.baseId } : {}),
      ...(params?.ownerId ? { base: { ownerId: params.ownerId } } : {}),
    },
    select: {
      id: true,
      baseId: true,
      name: true,
      position: true, // NUEVO
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

/** Restaurar una tabla de la papelera */
export async function restoreTable(baseId: number, tableId: number) {
  const tbl = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true, isTrashed: true },
  });
  if (!tbl || tbl.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada');
    err.status = 404;
    throw err;
  }
  if (!tbl.isTrashed) {
    const err: any = new Error('La tabla no está en la papelera.');
    err.status = 400;
    throw err;
  }

  try {
    // Al restaurar, si no tiene position, la mandamos al final
    const newPos = await getNextPosition(baseId);
    return await prisma.tableDef.update({
      where: { id: tableId },
      data: { isTrashed: false, trashedAt: null, position: newPos }, // Papelera + posición al final
      select: {
        id: true,
        baseId: true,
        name: true,
        position: true, // NUEVO
        createdAt: true,
        updatedAt: true,
        isTrashed: true,
        trashedAt: true,
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
  if (!tbl || tbl.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada');
    err.status = 404;
    throw err;
  }
  if (!tbl.isTrashed) {
    const err: any = new Error('La tabla no está en la papelera.');
    err.status = 400;
    throw err;
  }
  await prisma.tableDef.delete({ where: { id: tableId } });
}

/** Vaciar papelera de una base (borrado definitivo) */
export async function emptyTrashForBase(baseId: number) {
  await prisma.tableDef.deleteMany({
    where: { baseId, isTrashed: true },
  });
}

/** Purga automática de tablas (≥ N días en papelera) */
export async function purgeTrashedTablesOlderThan(days: number = 30) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.tableDef.deleteMany({
    where: { isTrashed: true, trashedAt: { lte: threshold } },
  });
}