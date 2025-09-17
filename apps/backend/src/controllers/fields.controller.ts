import { Request, Response } from 'express';
import { z } from 'zod';
import {
  listFieldsSvc,
  createFieldSvc,
  updateFieldSvc,
  deleteFieldSvc,
} from '../services/fields.service.js';
import { currentUserId } from '../utils/currentUser.js';

const createFieldSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: z.enum(['TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'CHECKBOX', 'DATE', 'DATETIME']),
});

const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'CHECKBOX', 'DATE', 'DATETIME']).optional(),
  position: z.number().int().min(0).optional(),
});

export async function listFields(req: Request, res: Response) {
  try {
    const tableId = Number(req.params.tableId);
    const fields = await listFieldsSvc(tableId);
    res.json({ ok: true, fields });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}

export async function createField(req: Request, res: Response) {
  try {
    const tableId = Number(req.params.tableId);
    const userId = currentUserId(req, res);
    const input = createFieldSchema.parse(req.body);
    const field = await createFieldSvc(tableId, input, userId);
    res.json({ ok: true, field });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}

export async function updateField(req: Request, res: Response) {
  try {
    const tableId = Number(req.params.tableId);
    const fieldId = Number(req.params.fieldId);
    const userId = currentUserId(req, res);
    const patch = updateFieldSchema.parse(req.body);
    const field = await updateFieldSvc(tableId, fieldId, patch, userId);
    res.json({ ok: true, field });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}

export async function deleteField(req: Request, res: Response) {
  try {
    const tableId = Number(req.params.tableId);
    const fieldId = Number(req.params.fieldId);
    const userId = currentUserId(req, res);
    await deleteFieldSvc(tableId, fieldId, userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e?.status ?? 400).json({ ok: false, error: e?.message ?? 'Error' });
  }
}