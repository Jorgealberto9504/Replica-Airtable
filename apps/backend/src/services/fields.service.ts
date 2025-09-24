import { prisma } from './db.js';
import { Prisma, FieldType } from '@prisma/client';
import { badRequest, conflict, notFound } from '../utils/errors.js';

/* =========================
   Helpers
   ========================= */
function isValidFieldType(t: any): t is FieldType {
  return Object.values(FieldType).includes(t as FieldType);
}
const isSelectType = (t: FieldType | undefined) =>
  t === 'SINGLE_SELECT' || t === 'MULTI_SELECT';

function tsStamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function nextFieldPosition(tableId: number) {
  const agg = await prisma.field.aggregate({
    where: { tableId, isTrashed: false },
    _max: { position: true },
  });
  return (agg._max.position ?? 0) + 1;
}
async function nextOptionPosition(fieldId: number) {
  const agg = await prisma.selectOption.aggregate({
    where: { fieldId, isTrashed: false },
    _max: { position: true },
  });
  return (agg._max.position ?? 0) + 1;
}

async function makeUniqueFieldName(
  tx: Prisma.TransactionClient,
  tableId: number,
  original: string
): Promise<string> {
  const stamp = tsStamp();
  let candidate = `${original} (restored ${stamp})`;
  let n = 1;
  while (true) {
    const exists = await tx.field.findFirst({
      where: { tableId, name: candidate, isTrashed: false },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${original} (restored ${stamp} #${n++})`;
  }
}

async function makeUniqueOptionLabel(
  tx: Prisma.TransactionClient,
  fieldId: number,
  original: string
): Promise<string> {
  const stamp = tsStamp();
  let candidate = `${original} (restored ${stamp})`;
  let n = 1;
  while (true) {
    const exists = await tx.selectOption.findFirst({
      where: { fieldId, label: candidate, isTrashed: false },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${original} (restored ${stamp} #${n++})`;
  }
}

/* =========================
   FIELDS (columnas)
   ========================= */

export async function listFieldsSvc(tableId: number) {
  return prisma.field.findMany({
    where: { tableId, isTrashed: false },
    orderBy: { position: 'asc' },
    include: {
      options: {
        where: { isTrashed: false },
        orderBy: { position: 'asc' },
        select: { id: true, label: true, color: true, position: true },
      },
    },
  });
}

type CreateFieldInput = {
  name: string;
  type: FieldType;
  options?: Array<{ label: string; color?: string | null }>;
};
export async function createFieldSvc(
  tableId: number,
  input: CreateFieldInput,
  userId: number | null
) {
  const name = String(input?.name ?? '').trim();
  if (!name) throw badRequest('El nombre de la columna es obligatorio.');
  if (!isValidFieldType(input?.type)) throw badRequest('Tipo de columna inválido.');

  const dup = await prisma.field.findFirst({
    where: { tableId, isTrashed: false, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (dup) throw conflict('Ya existe una columna con ese nombre en esta tabla.');

  const position = await nextFieldPosition(tableId);

  return prisma.$transaction(async (tx) => {
    const field = await tx.field.create({
      data: {
        tableId,
        name,
        type: input.type,
        position,
        createdById: userId ?? undefined,
        updatedById: userId ?? undefined,
      },
    });

    if (isSelectType(input.type) && Array.isArray(input.options) && input.options.length) {
      let pos = 1;
      for (const op of input.options) {
        const label = String(op.label ?? '').trim();
        if (!label) continue;
        await tx.selectOption.create({
          data: { fieldId: field.id, label, color: op.color ?? null, position: pos++ },
        });
      }
    }

    return tx.field.findUnique({
      where: { id: field.id },
      include: {
        options: {
          where: { isTrashed: false },
          orderBy: { position: 'asc' },
          select: { id: true, label: true, color: true, position: true },
        },
      },
    });
  });
}

type UpdateFieldPatch = Partial<{
  name: string;
  type: FieldType;
  position: number;
  options: Array<{ label: string; color?: string | null }>;
}>;
export async function updateFieldSvc(
  tableId: number,
  fieldId: number,
  patch: UpdateFieldPatch,
  userId: number | null
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.field.findFirst({
      where: { id: fieldId, tableId, isTrashed: false },
    });
    if (!current) throw notFound('Columna no encontrada.');

    const data: any = { updatedById: userId ?? undefined };

    // --- Nombre (unicidad dentro de la tabla) ---
    if (patch.name !== undefined) {
      const name = String(patch.name).trim();
      if (!name) throw badRequest('El nombre no puede estar vacío.');
      const dup = await tx.field.findFirst({
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

    // --- Tipo ---
    if (patch.type !== undefined) {
      if (!isValidFieldType(patch.type)) throw badRequest('Tipo inválido.');
      if (patch.type !== current.type) {
        // bloquear cambio si HAY datos cargados
        const used = await tx.recordCell.count({
          where: {
            fieldId,
            OR: [
              { stringValue: { not: null } },
              { numberValue: { not: null } },
              { boolValue: { not: null } },
              { dateValue: { not: null } },
              { datetimeValue: { not: null } },
              { timeMinutes: { not: null } },
              { selectOptionId: { not: null } },
              { options: { some: {} } },
            ],
          },
        });
        if (used > 0)
          throw conflict('No puedes cambiar el tipo de una columna que ya tiene datos.');

        // si vamos a tipo NO select, limpiar/soft-deletear opciones
        if (isSelectType(current.type) && !isSelectType(patch.type)) {
          await tx.selectOption.updateMany({
            where: { fieldId, isTrashed: false },
            data: { isTrashed: true, trashedAt: new Date() },
          });
          await tx.recordCell.updateMany({
            where: { fieldId },
            data: { selectOptionId: null },
          });
          await tx.recordCellOption.deleteMany({
            where: { option: { fieldId } },
          });
        }

        // si vamos a tipo SELECT exigir options (el controller ya validó, aquí por seguridad)
        if (!isSelectType(current.type) && isSelectType(patch.type)) {
          if (!Array.isArray(patch.options) || patch.options.length === 0) {
            throw badRequest(
              'Debes enviar "options" al cambiar una columna a SINGLE_SELECT o MULTI_SELECT.'
            );
          }
        }

        data.type = patch.type;
      }
    }

    if (patch.position !== undefined) data.position = Number(patch.position);

    // 1) actualizamos el field
    await tx.field.update({ where: { id: fieldId }, data });

    // 2) si el resultado es select y nos mandaron options, REEMPLAZAMOS opciones
    const finalType = (patch.type ?? current.type) as FieldType;
    if (isSelectType(finalType) && Array.isArray(patch.options)) {
      // limpiar activas actuales
      await tx.selectOption.updateMany({
        where: { fieldId, isTrashed: false },
        data: { isTrashed: true, trashedAt: new Date() },
      });
      let pos = 1;
      for (const op of patch.options) {
        const label = String(op.label ?? '').trim();
        if (!label) continue;
        await tx.selectOption.create({
          data: { fieldId, label, color: op.color ?? null, position: pos++ },
        });
      }
    }

    // 3) devolver field + opciones activas
    return tx.field.findUnique({
      where: { id: fieldId },
      include: {
        options: {
          where: { isTrashed: false },
          orderBy: { position: 'asc' },
          select: { id: true, label: true, color: true, position: true },
        },
      },
    });
  });
}

/** Soft delete Field (y por UX marcamos opciones en papelera y limpiamos selecciones) */
export async function deleteFieldSvc(tableId: number, fieldId: number, userId: number | null) {
  const found = await prisma.field.findFirst({
    where: { id: fieldId, tableId, isTrashed: false },
    select: { id: true },
  });
  if (!found) throw notFound('Columna no encontrada.');

  await prisma.$transaction(async (tx) => {
    await tx.field.update({
      where: { id: fieldId },
      data: { isTrashed: true, trashedAt: new Date(), updatedById: userId ?? undefined },
    });
    await tx.selectOption.updateMany({
      where: { fieldId, isTrashed: false },
      data: { isTrashed: true, trashedAt: new Date() },
    });
    await tx.recordCell.updateMany({
      where: { fieldId },
      data: {
        stringValue: null,
        numberValue: null,
        boolValue: null,
        dateValue: null,
        datetimeValue: null,
        timeMinutes: null,
        selectOptionId: null,
      },
    });
    await tx.recordCellOption.deleteMany({
      where: { option: { fieldId } },
    });
  });
}

/** Restore Field + opciones (rename si hay conflicto) */
export async function restoreFieldSvc(tableId: number, fieldId: number) {
  const fld = await prisma.field.findUnique({
    where: { id: fieldId },
    select: { id: true, tableId: true, name: true, isTrashed: true },
  });
  if (!fld || fld.tableId !== tableId || !fld.isTrashed) {
    throw notFound('Columna no está en papelera.');
  }

  return prisma.$transaction(async (tx) => {
    let restored;
    try {
      restored = await tx.field.update({
        where: { id: fieldId },
        data: { isTrashed: false, trashedAt: null },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const newName = await makeUniqueFieldName(tx, tableId, fld.name);
        restored = await tx.field.update({
          where: { id: fieldId },
          data: { name: newName, isTrashed: false, trashedAt: null },
        });
      } else {
        throw e;
      }
    }

    await tx.selectOption.updateMany({
      where: { fieldId, isTrashed: true },
      data: { isTrashed: false, trashedAt: null },
    });

    const pos = await nextFieldPosition(tableId);
    restored = await tx.field.update({ where: { id: fieldId }, data: { position: pos } });

    return restored;
  });
}

/** Delete permanente (solo si está en papelera) */
export async function deleteFieldPermanentSvc(tableId: number, fieldId: number) {
  const fld = await prisma.field.findUnique({
    where: { id: fieldId },
    select: { id: true, tableId: true, isTrashed: true },
  });
  if (!fld || fld.tableId !== tableId) throw notFound('Columna no encontrada.');
  if (!fld.isTrashed) throw badRequest('La columna no está en papelera.');
  await prisma.field.delete({ where: { id: fieldId } });
}

/** Papelera (Fields) */
export async function listTrashedFieldsForTableSvc(tableId: number) {
  return prisma.field.findMany({
    where: { tableId, isTrashed: true },
    orderBy: { trashedAt: 'desc' },
  });
}
export async function emptyFieldTrashForTableSvc(tableId: number) {
  await prisma.field.deleteMany({ where: { tableId, isTrashed: true } });
}
export async function purgeTrashedFieldsOlderThanSvc(days = 30) {
  const threshold = new Date(Date.now() - days * 86400_000);
  await prisma.field.deleteMany({
    where: { isTrashed: true, trashedAt: { lte: threshold } },
  });
}

/* =========================
   SELECT OPTIONS
   ========================= */

export async function listOptionsSvc(fieldId: number) {
  return prisma.selectOption.findMany({
    where: { fieldId, isTrashed: false },
    orderBy: { position: 'asc' },
  });
}
export async function listTrashedOptionsSvc(fieldId: number) {
  return prisma.selectOption.findMany({
    where: { fieldId, isTrashed: true },
    orderBy: { trashedAt: 'desc' },
  });
}
export async function createOptionSvc(
  fieldId: number,
  input: { label: string; color?: string | null }
) {
  const fld = await prisma.field.findUnique({ where: { id: fieldId } });
  if (!fld || fld.isTrashed) throw notFound('Columna no encontrada o en papelera.');
  if (!isSelectType(fld.type)) throw badRequest('Esta columna no admite opciones.');

  const label = String(input.label ?? '').trim();
  if (!label) throw badRequest('El label es obligatorio.');

  const dup = await prisma.selectOption.findFirst({
    where: { fieldId, isTrashed: false, label: { equals: label, mode: 'insensitive' } },
    select: { id: true },
  });
  if (dup) throw conflict('Ya existe una opción con ese label.');

  const pos = await nextOptionPosition(fieldId);
  return prisma.selectOption.create({
    data: { fieldId, label, color: input.color ?? null, position: pos },
  });
}
export async function updateOptionSvc(
  fieldId: number,
  optionId: number,
  patch: Partial<{ label: string; color: string | null; position: number }>
) {
  const op = await prisma.selectOption.findUnique({ where: { id: optionId } });
  if (!op || op.fieldId !== fieldId) throw notFound('Opción no encontrada.');

  const data: any = {};
  if (patch.label !== undefined) {
    const label = String(patch.label ?? '').trim();
    if (!label) throw badRequest('El label no puede estar vacío.');
    const dup = await prisma.selectOption.findFirst({
      where: {
        fieldId,
        isTrashed: false,
        id: { not: optionId },
        label: { equals: label, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (dup) throw conflict('Ya existe otra opción con ese label.');
    data.label = label;
  }
  if (patch.color !== undefined) data.color = patch.color;
  if (patch.position !== undefined) data.position = Number(patch.position);

  return prisma.selectOption.update({ where: { id: optionId }, data });
}
export async function reorderOptionsSvc(fieldId: number, orderedIds: number[]) {
  const current = await prisma.selectOption.findMany({
    where: { fieldId, isTrashed: false },
    select: { id: true },
    orderBy: { position: 'asc' },
  });
  const currentIds = current.map((o) => o.id);
  const uniqueOrdered = Array.from(new Set(orderedIds));
  if (uniqueOrdered.length !== currentIds.length) {
    throw badRequest('La lista no coincide con el total de opciones activas.');
  }
  const set = new Set(currentIds);
  for (const id of uniqueOrdered) if (!set.has(id)) throw badRequest(`Opción inválida ${id}`);

  await prisma.$transaction(
    uniqueOrdered.map((id, idx) =>
      prisma.selectOption.update({ where: { id }, data: { position: idx + 1 } }),
    )
  );
  return { ok: true };
}
export async function deleteOptionSvc(fieldId: number, optionId: number) {
  const op = await prisma.selectOption.findUnique({ where: { id: optionId } });
  if (!op || op.fieldId !== fieldId || op.isTrashed) throw notFound('Opción no encontrada.');

  await prisma.$transaction(async (tx) => {
    await tx.selectOption.update({
      where: { id: optionId },
      data: { isTrashed: true, trashedAt: new Date() },
    });
    await tx.recordCell.updateMany({
      where: { selectOptionId: optionId },
      data: { selectOptionId: null },
    });
    await tx.recordCellOption.deleteMany({
      where: { optionId },
    });
  });
}
export async function restoreOptionSvc(fieldId: number, optionId: number) {
  const op = await prisma.selectOption.findUnique({ where: { id: optionId } });
  if (!op || op.fieldId !== fieldId || !op.isTrashed) throw notFound('Opción no está en papelera.');

  try {
    return await prisma.selectOption.update({
      where: { id: optionId },
      data: { isTrashed: false, trashedAt: null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const label = await prisma.$transaction((tx) =>
        makeUniqueOptionLabel(tx, fieldId, op.label)
      );
      return prisma.selectOption.update({
        where: { id: optionId },
        data: { label, isTrashed: false, trashedAt: null },
      });
    }
    throw e;
  }
}
export async function deleteOptionPermanentSvc(fieldId: number, optionId: number) {
  const op = await prisma.selectOption.findUnique({ where: { id: optionId } });
  if (!op || op.fieldId !== fieldId) throw notFound('Opción no encontrada.');
  if (!op.isTrashed) throw badRequest('La opción no está en papelera.');
  await prisma.selectOption.delete({ where: { id: optionId } });
}