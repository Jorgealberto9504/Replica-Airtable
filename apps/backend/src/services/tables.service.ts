// apps/backend/src/services/tables.service.ts
import { prisma } from './db.js';
import { Prisma } from '@prisma/client';

/**
 * Crea una tabla dentro de una base.
 * - (baseId, name) es único por el @@unique definido en Prisma.
 */
export async function createTable(baseId: number, name: string) {
  return prisma.tableDef.create({
    data: { baseId, name },
    select: {
      id: true,
      baseId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Lista todas las tablas de una base.
 */
export async function listTablesForBase(baseId: number) {
  return prisma.tableDef.findMany({
    where: { baseId },
    select: {
      id: true,
      baseId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { id: 'asc' },
  });
}

/**
 * Obtiene una tabla por id dentro de una base.
 * (Usamos baseId en el where para garantizar que pertenece a esa base).
 */
export async function getTableById(baseId: number, tableId: number) {
  return prisma.tableDef.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      baseId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  }).then((tbl) => (tbl && tbl.baseId === baseId ? tbl : null));
}

/**
 * Actualiza (por ahora sólo el nombre) de una tabla de la base.
 */
export async function updateTable(
  baseId: number,
  tableId: number,
  patch: { name?: string },
) {
  // Para seguridad, verificamos pertenencia antes de actualizar.
  const existing = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true },
  });
  if (!existing || existing.baseId !== baseId) {
    // Imitamos el comportamiento de P2025 (no encontrado)
    const err: any = new Error('Tabla no encontrada');
    err.code = 'P2025';
    throw err;
  }

  return prisma.tableDef.update({
    where: { id: tableId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
    },
    select: {
      id: true,
      baseId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Elimina una tabla de la base.
 */
export async function deleteTable(baseId: number, tableId: number) {
  // Verificamos pertenencia antes de borrar.
  const existing = await prisma.tableDef.findUnique({
    where: { id: tableId },
    select: { id: true, baseId: true },
  });
  if (!existing || existing.baseId !== baseId) {
    const err: any = new Error('Tabla no encontrada');
    err.code = 'P2025';
    throw err;
  }

  await prisma.tableDef.delete({
    where: { id: tableId },
  });
}

/** Helper para detectar violación de unique (baseId, name) */
export function isDuplicateTableNameError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}