// apps/backend/src/controllers/records.controller.ts

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  listRecordsSvc,
  createRecordSvc,
  patchRecordSvc,
  deleteRecordSvc,
  // trash
  listTrashedRecordsForTableSvc,
  restoreRecordSvc,
  deleteRecordPermanentSvc,
  emptyRecordTrashForTableSvc,
  purgeTrashedRecordsOlderThanSvc,
} from '../services/records.service.js';
import { currentUserId } from '../utils/currentUser.js';

/** Diccionario dinámico { fieldId: any } */
const valuesSchema = z.object({}).catchall(z.any());

/** Query: soporta ?all=1 para traer todo (sin paginar) */
const listQuerySchema = z.object({
  all: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

const createRecordSchema = z.object({
  values: valuesSchema.default({}),
});

const patchRecordSchema = z.object({
  values: valuesSchema,
});

/* ========== CRUD RECORDS ========== */

export async function listRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const { all, page, pageSize } = listQuerySchema.parse(req.query);

    const effectivePage = all ? 1 : page;
    const effectiveSize = all ? 1_000_000 : pageSize;

    const { total, records } = await listRecordsSvc(
      baseId,
      tableId,
      effectivePage,
      effectiveSize
    );
    // records ahora puede incluir opcionalmente { lastChange }
    res.json({ ok: true, total, records });
  } catch (e) { next(e); }
}

export async function createRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const userId = currentUserId(req, res);
    const { values } = createRecordSchema.parse(req.body);

    const rec = await createRecordSvc(baseId, tableId, values, userId);
    res.json({ ok: true, record: { id: rec.id, values } });
  } catch (e) { next(e); }
}

export async function patchRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const recordId = Number(req.params.recordId);
    const userId = currentUserId(req, res);
    const { values } = patchRecordSchema.parse(req.body);

    await patchRecordSvc(baseId, tableId, recordId, values, userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function deleteRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const recordId = Number(req.params.recordId);
    const userId = currentUserId(req, res);

    await deleteRecordSvc(baseId, tableId, recordId, userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

/* ========== Papelera (REGISTROS) ========== */

export async function listTrashedRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const rows = await listTrashedRecordsForTableSvc(tableId);
    res.json({ ok: true, records: rows });
  } catch (e) { next(e); }
}

export async function restoreRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const recordId = Number(req.params.recordId);
    await restoreRecordSvc(tableId, recordId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function deleteRecordPermanent(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const recordId = Number(req.params.recordId);
    await deleteRecordPermanentSvc(tableId, recordId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function emptyRecordTrash(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    await emptyRecordTrashForTableSvc(tableId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function purgeRecordTrash(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Number(req.query.days ?? 30);
    await purgeTrashedRecordsOlderThanSvc(Number.isFinite(days) && days >= 0 ? days : 30);
    res.json({ ok: true, purgedAfterDays: Number.isFinite(days) ? days : 30 });
  } catch (e) { next(e); }
}