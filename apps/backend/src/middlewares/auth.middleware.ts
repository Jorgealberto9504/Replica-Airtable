// apps/backend/src/middlewares/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, type JwtPayload } from '../services/security/jwt.service.js';

const COOKIE_NAME = process.env.COOKIE_NAME ?? 'session';

export type AuthRequest = Request & { user?: JwtPayload };

/** Lee el JWT de la cookie y rellena req.user si es válido. */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ ok: false, error: 'No autenticado' });

  try {
    const payload = verifyJwt<JwtPayload>(token);
    req.user = payload; // { sub, email?, role? }
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

/** Exige que el usuario autenticado sea SYSADMIN. */
export function requireSysadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (req.user.role !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'Requiere rol SYSADMIN' });
  }
  return next();
}