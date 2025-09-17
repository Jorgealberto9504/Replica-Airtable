import { prisma } from './db.js';
import { Prisma, FieldType } from '@prisma/client';
import { badRequest, notFound } from '../utils/errors.js';

export async function listRecordsSvc(
  _baseId: number,
  tableId: number,
  page: number,
  pageSize: number
) {
  const [rows, total, fields] = await Promise.all([
    prisma.recordRow.findMany({
      where: { tableId, isTrashed: false },
      include: { cells: true },
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recordRow.count({ where: { tableId, isTrashed: false } }),
    prisma.field.findMany({
      where: { tableId, isTrashed: false },
      select: { id: true },
    }),
  ]);

  const fieldIds = fields.map((f) => f.id);
  const records = rows.map((r) => {
    const values: Record<string, any> = {};
    for (const c of r.cells) {
      const v =
        c.stringValue ??
        c.numberValue ??
        c.boolValue ??
        c.dateValue ??
        c.datetimeValue ??
        null;
      values[String(c.fieldId)] = v;
    }
    for (const fid of fieldIds) if (!(fid in values)) values[String(fid)] = null;
    return { id: r.id, values };
  });

  return { total, records };
}

export async function createRecordSvc(
  _baseId: number,
  tableId: number,
  values: Record<string, any> | undefined,
  userId: number | null
) {
  return prisma.$transaction(async (tx) => {
    const rec = await tx.recordRow.create({
      data: {
        tableId,
        createdById: userId ?? undefined,
        updatedById: userId ?? undefined,
      },
    });

    if (values && Object.keys(values).length) {
      await patchCellsTx(tx, tableId, rec.id, values, userId);
      await tx.recordRow.update({
        where: { id: rec.id },
        data: { updatedById: userId ?? undefined },
      });
    }
    return rec;
  });
}

export async function patchRecordSvc(
  _baseId: number,
  tableId: number,
  recordId: number,
  values: Record<string, any>,
  userId: number | null
) {
  const exists = await prisma.recordRow.findFirst({
    where: { id: recordId, tableId, isTrashed: false },
    select: { id: true },
  });
  if (!exists) throw notFound('El registro no existe en esta tabla.');

  await prisma.$transaction(async (tx) => {
    await patchCellsTx(tx, tableId, recordId, values, userId);
    await tx.recordRow.update({
      where: { id: recordId },
      data: { updatedById: userId ?? undefined },
    });
  });
}

export async function deleteRecordSvc(
  _baseId: number,
  tableId: number,
  recordId: number,
  userId: number | null
) {
  const exists = await prisma.recordRow.findFirst({
    where: { id: recordId, tableId, isTrashed: false },
    select: { id: true },
  });
  if (!exists) throw notFound('El registro no existe en esta tabla.');

  await prisma.recordRow.update({
    where: { id: recordId },
    data: {
      isTrashed: true,
      trashedAt: new Date(),
      updatedById: userId ?? undefined,
    },
  });
}

/* ------------ helpers ------------ */

function coerceValue(type: FieldType, raw: any) {
  if (raw == null) return null;

  switch (type) {
    case 'TEXT':
    case 'LONG_TEXT':
      return String(raw);

    case 'NUMBER':
    case 'CURRENCY': {
      const num = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isNaN(num)) throw badRequest('El valor debe ser numérico.');
      return new Prisma.Decimal(num);
    }

    case 'CHECKBOX': {
      if (typeof raw === 'boolean') return raw;
      const s = String(raw).toLowerCase();
      if (['1', 'true', 'sí', 'si', 'on', 'y'].includes(s)) return true;
      if (['0', 'false', 'no', 'off', 'n'].includes(s)) return false;
      throw badRequest('El valor debe ser booleano.');
    }

    case 'DATE': {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw badRequest('Fecha inválida.');
      d.setHours(0, 0, 0, 0);
      return d;
    }

    case 'DATETIME': {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw badRequest('Fecha/hora inválida.');
      return d;
    }
  }
}

async function patchCellsTx(
  tx: Prisma.TransactionClient,
  tableId: number,
  recordId: number,
  values: Record<string, any>,
  userId: number | null
) {
  const ids = Object.keys(values)
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
  if (!ids.length) return;

  const fields = await tx.field.findMany({
    where: { tableId, id: { in: ids }, isTrashed: false },
    select: { id: true, type: true },
  });

  const foundIds = new Set(fields.map((f) => f.id));
  const missing = ids.filter((fid) => !foundIds.has(fid));
  if (missing.length) {
    throw badRequest(`Campos inexistentes en esta tabla: ${missing.join(', ')}`);
  }

  await Promise.all(
    fields.map(async (f) => {
      const v = coerceValue(f.type, values[String(f.id)]);

      const data: any = {
        stringValue: null,
        numberValue: null,
        boolValue: null,
        dateValue: null,
        datetimeValue: null,
        updatedById: userId ?? undefined,
      };

      switch (f.type) {
        case 'TEXT':
        case 'LONG_TEXT':
          data.stringValue = v as string | null;
          break;
        case 'NUMBER':
        case 'CURRENCY':
          data.numberValue = v as Prisma.Decimal | null;
          break;
        case 'CHECKBOX':
          data.boolValue = v as boolean | null;
          break;
        case 'DATE':
          data.dateValue = v as Date | null;
          break;
        case 'DATETIME':
          data.datetimeValue = v as Date | null;
          break;
      }

      await tx.recordCell.upsert({
        where: { recordId_fieldId: { recordId, fieldId: f.id } },
        create: {
          recordId,
          fieldId: f.id,
          ...data,
          createdById: userId ?? undefined,
        },
        update: data,
      });
    })
  );
}