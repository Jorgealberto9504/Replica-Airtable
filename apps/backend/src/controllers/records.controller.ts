import { Request, Response } from 'express';
import { z } from 'zod';
import {
  listRecordsSvc,
  createRecordSvc,
  patchRecordSvc,
  deleteRecordSvc,
} from '../services/records.service.js';
import { currentUserId } from '../utils/currentUser.js';

/** Diccionario dinámico { fieldId: any } sin pelearse con TS/Zod v4 */
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

export async function listRecords(req: Request, res: Response) {
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
    res.json({ ok: true, total, records });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}

export async function createRecord(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const userId = currentUserId(req, res);
    const { values } = createRecordSchema.parse(req.body);

    const rec = await createRecordSvc(baseId, tableId, values, userId);
    res.json({ ok: true, record: { id: rec.id, values } });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}

export async function patchRecord(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const recordId = Number(req.params.recordId);
    const userId = currentUserId(req, res);
    const { values } = patchRecordSchema.parse(req.body);

    await patchRecordSvc(baseId, tableId, recordId, values, userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}

export async function deleteRecord(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const tableId = Number(req.params.tableId);
    const recordId = Number(req.params.recordId);
    const userId = currentUserId(req, res);

    await deleteRecordSvc(baseId, tableId, recordId, userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}