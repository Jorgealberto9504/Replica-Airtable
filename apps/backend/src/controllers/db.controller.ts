// apps/backend/src/controllers/db.controller.ts
import { Request, Response } from 'express';
import { pingDB, getDbVersion } from '../services/diagnostics.service.js';

// GET /db/check → verifica conexión a BD
export async function checkDb(_req: Request, res: Response) {
  try {
    await pingDB();
    res.json({ ok: true, db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// GET /db/info → versión de Postgres
export async function infoDb(_req: Request, res: Response) {
  try {
    const version = await getDbVersion();
    res.json({ ok: true, version });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}