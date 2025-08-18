// apps/backend/src/controllers/db.controller.ts
import { Request, Response } from 'express';
import { pingDB, getDbVersion } from '../services/diagnostics.service.js';
import { createUserDev } from '../services/users.service.js';

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

// POST /db/write → prueba de ESCRITURA (insert en User)
export async function writeUser(req: Request, res: Response) {
  try {
    const { email, fullName } = req.body || {};
    if (!email || !fullName) {
      return res.status(400).json({ ok: false, error: 'email y fullName son requeridos' });
    }
    const user = await createUserDev({ email, fullName });
    res.status(201).json({ ok: true, user });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'email ya existe' });
    }
    res.status(500).json({ ok: false, error: 'No se pudo crear el usuario' });
  }
}


/*
Ejemplo de petición POST a /db/write:
 {
  "email": "Saul@Saul.com",
  "fullName": "Saul Goodman"
}

  */