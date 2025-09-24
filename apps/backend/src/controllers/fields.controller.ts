// apps/backend/src/controllers/fields.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  listFieldsSvc,
  createFieldSvc,
  updateFieldSvc,
  deleteFieldSvc,
  restoreFieldSvc,
  deleteFieldPermanentSvc,
  listTrashedFieldsForTableSvc,
  emptyFieldTrashForTableSvc,
  purgeTrashedFieldsOlderThanSvc,
  // options
  listOptionsSvc,
  listTrashedOptionsSvc,
  createOptionSvc,
  updateOptionSvc,
  reorderOptionsSvc,
  deleteOptionSvc,
  restoreOptionSvc,
  deleteOptionPermanentSvc,
} from '../services/fields.service.js';
import { currentUserId } from '../utils/currentUser.js';

const FieldTypeSchema = z.enum([
  'TEXT',
  'LONG_TEXT',
  'NUMBER',
  'CURRENCY',
  'CHECKBOX',
  'DATE',
  'DATETIME',
  'TIME',
  'SINGLE_SELECT',
  'MULTI_SELECT',
]);

const createFieldSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: FieldTypeSchema,
  options: z
    .array(z.object({ label: z.string().min(1), color: z.string().nullable().optional() }))
    .optional(),
});

const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  type: FieldTypeSchema.optional(),
  position: z.number().int().min(0).optional(),
});

const createOptionSchema = z.object({
  label: z.string().min(1),
  color: z.string().nullable().optional(),
});
const updateOptionSchema = z.object({
  label: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});
const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
});

/* ============== FIELDS ============== */

export async function listFields(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const fields = await listFieldsSvc(tableId);
    res.json({ ok: true, fields });
  } catch (e) { next(e); }
}

export async function createField(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const userId = currentUserId(req, res);
    const input = createFieldSchema.parse(req.body);
    const field = await createFieldSvc(tableId, input, userId);
    res.json({ ok: true, field });
  } catch (e) { next(e); }
}

export async function updateField(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const fieldId = Number(req.params.fieldId);
    const userId = currentUserId(req, res);
    const patch = updateFieldSchema.parse(req.body);
    const field = await updateFieldSvc(tableId, fieldId, patch, userId);
    res.json({ ok: true, field });
  } catch (e) { next(e); }
}

export async function deleteField(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const fieldId = Number(req.params.fieldId);
    const userId = currentUserId(req, res);
    await deleteFieldSvc(tableId, fieldId, userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function restoreField(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const fieldId = Number(req.params.fieldId);
    const field = await restoreFieldSvc(tableId, fieldId);
    res.json({ ok: true, field });
  } catch (e) { next(e); }
}

export async function deleteFieldPermanent(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const fieldId = Number(req.params.fieldId);
    await deleteFieldPermanentSvc(tableId, fieldId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function listTrashedFields(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    const fields = await listTrashedFieldsForTableSvc(tableId);
    res.json({ ok: true, fields });
  } catch (e) { next(e); }
}

export async function emptyFieldTrash(req: Request, res: Response, next: NextFunction) {
  try {
    const tableId = Number(req.params.tableId);
    await emptyFieldTrashForTableSvc(tableId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function purgeFieldTrash(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Number(req.query.days ?? 30);
    await purgeTrashedFieldsOlderThanSvc(Number.isFinite(days) && days >= 0 ? days : 30);
    res.json({ ok: true, purgedAfterDays: Number.isFinite(days) ? days : 30 });
  } catch (e) { next(e); }
}

/* ============== OPTIONS ============== */

export async function listOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const rows = await listOptionsSvc(fieldId);
    res.json({ ok: true, options: rows });
  } catch (e) { next(e); }
}
export async function listTrashedOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const rows = await listTrashedOptionsSvc(fieldId);
    res.json({ ok: true, options: rows });
  } catch (e) { next(e); }
}
export async function createOption(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const input = createOptionSchema.parse(req.body);
    const row = await createOptionSvc(fieldId, input);
    res.json({ ok: true, option: row });
  } catch (e) { next(e); }
}
export async function updateOption(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const optionId = Number(req.params.optionId);
    const patch = updateOptionSchema.parse(req.body);
    const row = await updateOptionSvc(fieldId, optionId, patch);
    res.json({ ok: true, option: row });
  } catch (e) { next(e); }
}
export async function reorderOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const { orderedIds } = reorderSchema.parse(req.body);
    await reorderOptionsSvc(fieldId, orderedIds);
    res.json({ ok: true });
  } catch (e) { next(e); }
}
export async function deleteOption(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const optionId = Number(req.params.optionId);
    await deleteOptionSvc(fieldId, optionId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}
export async function restoreOption(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const optionId = Number(req.params.optionId);
    const row = await restoreOptionSvc(fieldId, optionId);
    res.json({ ok: true, option: row });
  } catch (e) { next(e); }
}
export async function deleteOptionPermanent(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldId = Number(req.params.fieldId);
    const optionId = Number(req.params.optionId);
    await deleteOptionPermanentSvc(fieldId, optionId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}