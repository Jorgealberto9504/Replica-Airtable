// apps/backend/src/services/records.service.ts
import { prisma, prismaDirect } from './db.js';
import { Prisma, FieldType } from '@prisma/client';
import { badRequest, notFound } from '../utils/errors.js';

/* ===================== LIST ===================== */
/**
 * Devuelve registros de una tabla:
 * - records[].values: diccionario { fieldId: valor }
 * - records[].lastChange (opcional):
 *    - Si el último evento fue en una celda:
 *      { kind: 'CELL', fieldId, fieldName, user: {id, fullName} | null, at: ISO }
 *    - Si el último evento fue un comentario:
 *      { kind: 'COMMENT', commentId, body, user: {id, fullName} | null, at: ISO }
 */
export async function listRecordsSvc(
  _baseId: number,
  tableId: number,
  page: number,
  pageSize: number
) {
  // Tipos y nombres de campos para interpretar valores y armar lastChange
  const fields = await prisma.field.findMany({
    where: { tableId, isTrashed: false },
    select: { id: true, type: true, name: true },
  });
  const typeById = new Map(fields.map((f) => [f.id, f.type]));
  const nameById = new Map(fields.map((f) => [f.id, f.name]));

  const [rows, total] = await Promise.all([
    prisma.recordRow.findMany({
      where: { tableId, isTrashed: false },
      include: {
        cells: {
          include: {
            // Para MULTI_SELECT
            options: true,
            // Para "Último cambio" (nombre de campo / usuario)
            field: { select: { id: true, name: true } },
            updatedBy: { select: { id: true, fullName: true } },
          },
        },
        // Traer el último comentario (no-trashed) por fila para lastChange
        comments: {
          where: { isTrashed: false },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, fullName: true} },
            updatedBy: { select: { id: true, fullName: true} },
          },
        },
      },
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recordRow.count({ where: { tableId, isTrashed: false } }),
  ]);

  const fieldIds = fields.map((f) => f.id);

  const records = rows.map((r) => {
    const values: Record<string, any> = {};

    // Construye valores por celda según tipo
    for (const c of r.cells) {
      const t = typeById.get(c.fieldId);
      let v: any = null;

      if (t === 'MULTI_SELECT') {
        v = c.options.map((o) => o.optionId); // array de optionIds
      } else if (t === 'SINGLE_SELECT') {
        v = c.selectOptionId ?? null; // optionId o null
      } else if (t === 'TIME') {
        v = c.timeMinutes ?? null; // minutos 0..1439
      } else {
        v =
          c.stringValue ??
          c.numberValue ??
          c.boolValue ??
          c.dateValue ??
          c.datetimeValue ??
          null;
      }

      values[String(c.fieldId)] = v;
    }

    // Completar nulls para campos que no tienen celda
    for (const fid of fieldIds) if (!(fid in values)) values[String(fid)] = null;

    // === Último cambio: comparamos "última celda actualizada" vs "último comentario" ===
    let latestCell: (typeof r.cells)[number] | null = null;
    for (const c of r.cells) {
      if (!latestCell || c.updatedAt > latestCell.updatedAt) latestCell = c;
    }
    const latestComment = r.comments[0] ?? null;

    const cellAt = latestCell?.updatedAt ?? null;
    const commentAt = latestComment
      ? (latestComment.updatedAt ?? latestComment.createdAt)
      : null;

    let lastChange: any = null;

    if (commentAt && (!cellAt || commentAt > cellAt)) {
      // Gana el comentario
      lastChange = {
        kind: 'COMMENT' as const,
        commentId: latestComment!.id,
        body: latestComment!.body,
        user:
          latestComment!.updatedBy ??
          latestComment!.createdBy ??
          null,
        at: (latestComment!.updatedAt ?? latestComment!.createdAt).toISOString(),
      };
    } else if (cellAt) {
      // Gana la celda
      lastChange = {
        kind: 'CELL' as const,
        fieldId: latestCell!.fieldId ?? null,
        fieldName:
          latestCell!.field?.name ??
          nameById.get(latestCell!.fieldId) ??
          null,
        user: latestCell!.updatedBy ?? null,
        at: latestCell!.updatedAt.toISOString(),
      };
    }

    return { id: r.id, values, ...(lastChange ? { lastChange } : {}) };
  });

  return { total, records };
}

/* ===================== CREATE / PATCH / DELETE ===================== */

export async function createRecordSvc(
  _baseId: number,
  tableId: number,
  values: Record<string, any> | undefined,
  userId: number | null
) {
  return prismaDirect.$transaction(async (tx) => {
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

  await prismaDirect.$transaction(async (tx) => {
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

/* ===================== HELPERS ===================== */

function coerceValue(type: FieldType, raw: any) {
  if (raw == null) return null;

  switch (type) {
    case 'TEXT':
    case 'LONG_TEXT':
      return String(raw);

    case 'NUMBER':
    case 'CURRENCY': {
      const num =
        typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
      if (Number.isNaN(num)) throw badRequest('El valor debe ser numérico.');
      return new Prisma.Decimal(num);
    }

    case 'CHECKBOX': {
      if (typeof raw === 'boolean') return raw;
      const s = String(raw).toLowerCase().trim();
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

    case 'TIME': {
      if (typeof raw === 'number') {
        const n = Math.trunc(raw);
        if (n < 0 || n > 1439)
          throw badRequest('TIME inválido (minutos 0..1439).');
        return n;
      }
      const s = String(raw).trim();
      const m = /^(\d{1,2}):(\d{2})$/.exec(s);
      if (!m) throw badRequest('TIME inválido. Usa "HH:mm" o minutos.');
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
        throw badRequest('TIME inválido.');
      return hh * 60 + mm;
    }
  }
  return null;
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

  // 1) Campos válidos para esta tabla
  const fields = await tx.field.findMany({
    where: { tableId, id: { in: ids }, isTrashed: false },
    select: { id: true, type: true },
  });

  const foundIds = new Set(fields.map((f) => f.id));
  const missing = ids.filter((fid) => !foundIds.has(fid));
  if (missing.length) {
    throw badRequest(`Campos inexistentes en esta tabla: ${missing.join(', ')}`);
  }

  // 2) Procesar SECUENCIALMENTE (¡sin Promise.all dentro de la tx!)
  for (const f of fields) {
    const raw = values[String(f.id)];
    const baseData: any = {
      stringValue: null,
      numberValue: null,
      boolValue: null,
      dateValue: null,
      datetimeValue: null,
      timeMinutes: null,
      selectOptionId: null,
      updatedById: userId ?? undefined,
    };

    if (f.type === 'SINGLE_SELECT') {
      if (raw == null) {
        await upsertCell(tx, recordId, f.id, baseData, userId);
        continue;
      }
      const optId = Number(raw);
      if (!Number.isFinite(optId)) {
        throw badRequest(
          `SINGLE_SELECT: optionId inválido para campo ${f.id}`
        );
      }

      const ok = await tx.selectOption.findFirst({
        where: { id: optId, fieldId: f.id, isTrashed: false },
        select: { id: true },
      });
      if (!ok) {
        throw badRequest(
          `SINGLE_SELECT: optionId ${optId} no pertenece al campo ${f.id}`
        );
      }

      baseData.selectOptionId = optId;
      await upsertCell(tx, recordId, f.id, baseData, userId);
      continue;
    }

    if (f.type === 'MULTI_SELECT') {
      // normalizamos a array de números
      let list: number[] = [];
      if (raw == null) list = [];
      else if (Array.isArray(raw))
        list = raw.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      else
        throw badRequest(
          `MULTI_SELECT espera arreglo de optionIds en campo ${f.id}`
        );

      // validar pertenencia
      if (list.length) {
        const valid = await tx.selectOption.findMany({
          where: { id: { in: list }, fieldId: f.id, isTrashed: false },
          select: { id: true },
        });
        const validSet = new Set(valid.map((v) => v.id));
        const invalid = list.filter((id) => !validSet.has(id));
        if (invalid.length) {
          throw badRequest(
            `MULTI_SELECT: optionIds inválidos para campo ${f.id}: ${invalid.join(
              ', '
            )}`
          );
        }
      }

      // asegurar celda y sincronizar join table
      const cell = await upsertCell(tx, recordId, f.id, baseData, userId);

      const current = await tx.recordCellOption.findMany({
        where: { recordCellId: cell.id },
        select: { optionId: true },
        orderBy: { optionId: 'asc' },
      });
      const currentSet = new Set(current.map((c) => c.optionId));
      const desiredSet = new Set(list);

      // eliminar los que ya no están
      for (const { optionId } of current) {
        if (!desiredSet.has(optionId)) {
          await tx.recordCellOption.delete({
            where: {
              recordCellId_optionId: { recordCellId: cell.id, optionId },
            },
          });
        }
      }
      // agregar nuevos
      for (const optionId of list) {
        if (!currentSet.has(optionId)) {
          await tx.recordCellOption.create({
            data: { recordCellId: cell.id, optionId },
          });
        }
      }
      continue;
    }

    // Tipos "normales"
    switch (f.type) {
      case 'TEXT':
      case 'LONG_TEXT':
        baseData.stringValue = coerceValue(f.type, raw) as string | null;
        break;
      case 'NUMBER':
      case 'CURRENCY':
        baseData.numberValue = coerceValue(
          f.type,
          raw
        ) as Prisma.Decimal | null;
        break;
      case 'CHECKBOX':
        baseData.boolValue = coerceValue(f.type, raw) as boolean | null;
        break;
      case 'DATE':
        baseData.dateValue = coerceValue(f.type, raw) as Date | null;
        break;
      case 'DATETIME':
        baseData.datetimeValue = coerceValue(f.type, raw) as Date | null;
        break;
      case 'TIME':
        baseData.timeMinutes = coerceValue(f.type, raw) as number | null;
        break;
    }

    await upsertCell(tx, recordId, f.id, baseData, userId);
  }
}

async function upsertCell(
  tx: Prisma.TransactionClient,
  recordId: number,
  fieldId: number,
  data: any,
  userId: number | null
) {
  return tx.recordCell.upsert({
    where: { recordId_fieldId: { recordId, fieldId } },
    create: { recordId, fieldId, ...data, createdById: userId ?? undefined },
    update: data,
  });
}

/* ===================== TRASH (registros) ===================== */

export async function listTrashedRecordsForTableSvc(tableId: number) {
  return prisma.recordRow.findMany({
    where: { tableId, isTrashed: true },
    orderBy: { trashedAt: 'desc' },
  });
}

export async function restoreRecordSvc(tableId: number, recordId: number) {
  const row = await prisma.recordRow.findUnique({
    where: { id: recordId },
    select: { id: true, tableId: true, isTrashed: true },
  });
  if (!row || row.tableId !== tableId) throw notFound('Registro no encontrado.');
  if (!row.isTrashed) throw badRequest('El registro no está en papelera.');
  return prisma.recordRow.update({
    where: { id: recordId },
    data: { isTrashed: false, trashedAt: null },
  });
}

export async function deleteRecordPermanentSvc(tableId: number, recordId: number) {
  const row = await prisma.recordRow.findUnique({
    where: { id: recordId },
    select: { id: true, tableId: true, isTrashed: true },
  });
  if (!row || row.tableId !== tableId) throw notFound('Registro no encontrado.');
  if (!row.isTrashed) throw badRequest('El registro no está en papelera.');
  await prisma.recordRow.delete({ where: { id: recordId } });
}

export async function emptyRecordTrashForTableSvc(tableId: number) {
  await prisma.recordRow.deleteMany({ where: { tableId, isTrashed: true } });
}

export async function purgeTrashedRecordsOlderThanSvc(days = 30) {
  const threshold = new Date(Date.now() - days * 86_400_000);
  await prisma.recordRow.deleteMany({
    where: { isTrashed: true, trashedAt: { lte: threshold } },
  });
}