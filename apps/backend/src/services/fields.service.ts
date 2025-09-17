import { prisma } from './db.js';
import { FieldType } from '@prisma/client';
import { badRequest, conflict, notFound } from '../utils/errors.js';

function isValidFieldType(t: any): t is FieldType {
  return Object.values(FieldType).includes(t as FieldType);
}

export async function listFieldsSvc(tableId: number) {
  return prisma.field.findMany({
    where: { tableId, isTrashed: false },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      tableId: true,
      name: true,
      type: true,
      position: true,
      config: true,
      createdById: true,
      updatedById: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
  });
}

export async function createFieldSvc(
  tableId: number,
  input: { name: string; type: FieldType },
  userId: number | null
) {
  const name = String(input?.name ?? '').trim();
  if (!name) throw badRequest('El nombre de la columna es obligatorio.');
  if (!isValidFieldType(input?.type)) throw badRequest('Tipo de columna inválido.');

  // Unicidad por tabla (case-insensitive) mientras no esté en papelera
  const dup = await prisma.field.findFirst({
    where: {
      tableId,
      isTrashed: false,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (dup) throw conflict('Ya existe una columna con ese nombre en esta tabla.');

  const pos =
    (await prisma.field.count({ where: { tableId, isTrashed: false } })) + 1;

  return prisma.field.create({
    data: {
      tableId,
      name,
      type: input.type,
      position: pos,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
    select: {
      id: true,
      tableId: true,
      name: true,
      type: true,
      position: true,
      config: true,
      createdById: true,
      updatedById: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
  });
}

export async function updateFieldSvc(
  tableId: number,
  fieldId: number,
  patch: Partial<{ name: string; type: FieldType; position: number }>,
  userId: number | null
) {
  const current = await prisma.field.findFirst({
    where: { id: fieldId, tableId, isTrashed: false },
  });
  if (!current) throw notFound('Columna no encontrada.');

  const data: any = { updatedById: userId ?? undefined };

  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (!name) throw badRequest('El nombre de la columna no puede estar vacío.');
    const dup = await prisma.field.findFirst({
      where: {
        tableId,
        isTrashed: false,
        id: { not: fieldId },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (dup) throw conflict('Ya existe otra columna con ese nombre.');
    data.name = name;
  }

  if (patch.type !== undefined) {
    if (!isValidFieldType(patch.type)) throw badRequest('Tipo de columna inválido.');
    if (patch.type !== current.type) {
      // Bloquear cambio de tipo si hay datos cargados
      const used = await prisma.recordCell.count({
        where: {
          fieldId,
          OR: [
            { stringValue: { not: null } },
            { numberValue: { not: null } },
            { boolValue: { not: null } },
            { dateValue: { not: null } },
            { datetimeValue: { not: null } },
          ],
        },
      });
      if (used > 0) {
        throw conflict('No puedes cambiar el tipo de una columna que ya tiene datos.');
      }
      data.type = patch.type;
    }
  }

  if (patch.position !== undefined) {
    data.position = Number(patch.position);
  }

  return prisma.field.update({
    where: { id: fieldId },
    data,
    select: {
      id: true,
      tableId: true,
      name: true,
      type: true,
      position: true,
      config: true,
      createdById: true,
      updatedById: true,
      createdAt: true,
      updatedAt: true,
      isTrashed: true,
      trashedAt: true,
    },
  });
}

export async function deleteFieldSvc(
  tableId: number,
  fieldId: number,
  userId: number | null
) {
  const found = await prisma.field.findFirst({
    where: { id: fieldId, tableId, isTrashed: false },
    select: { id: true },
  });
  if (!found) throw notFound('Columna no encontrada.');

  await prisma.field.update({
    where: { id: fieldId },
    data: {
      isTrashed: true,
      trashedAt: new Date(),
      updatedById: userId ?? undefined,
    },
  });
}