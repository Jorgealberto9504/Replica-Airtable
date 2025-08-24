// apps/backend/src/middlewares/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db.js';
import { verifyJwt } from '../services/security/jwt.service.js';

// Nombre de la cookie donde guardamos el JWT (viene de .env)
const COOKIE_NAME = process.env.COOKIE_NAME ?? 'session';

// 1) Verifica que el usuario esté autenticado (JWT válido en la cookie)
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // a) Leer la cookie
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ ok: false, error: 'No autenticado (sin cookie)' });
    }

    // b) Validar y decodificar el JWT
    const payload = verifyJwt<{ sub: string }>(token); // sub = id del usuario en string
    const userId = Number(payload.sub);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Token inválido' });
    }

    // c) Cargar el usuario desde la base (para revisar que exista y esté activo)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        platformRole: true,      // 'USER' | 'SYSADMIN'
        isActive: true,          // para desactivar cuentas
        mustChangePassword: true,// para “cambiar contraseña”
        canCreateBases: true,    // <-- NUEVO: permiso global de creador de bases
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, error: 'No autorizado' });
    }

    // d) Guardar el usuario en la request para que otros lo usen
    (req as any).user = user;

    // e) Pasar al siguiente middleware/controlador
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

// 2) Verifica que el usuario autenticado sea SYSADMIN
export function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user; // lo puso requireAuth
  if (!user) return res.status(401).json({ ok: false, error: 'No autenticado' });

  if (user.platformRole !== 'SYSADMIN') {
    return res.status(403).json({ ok: false, error: 'Solo superusuario' });
  }

  next();
}

// 2.1) Verifica que el usuario pueda crear bases (SYSADMIN o canCreateBases=true)
export function requireBaseCreator(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as
    | { platformRole: 'USER' | 'SYSADMIN'; canCreateBases: boolean }
    | undefined;

  if (!user) return res.status(401).json({ ok: false, error: 'No autenticado' });

  if (user.platformRole === 'SYSADMIN' || user.canCreateBases) {
    return next();
  }
  return res.status(403).json({ ok: false, error: 'No puedes crear bases' });
}

// 3) Helper para leer el usuario desde la request en tus controladores
export function getAuthUser<
  T = {
    id: number;
    email: string;
    platformRole: 'USER' | 'SYSADMIN';
    mustChangePassword: boolean;
    canCreateBases: boolean;
  }
>(req: Request): T | undefined {
  return (req as any).user as T | undefined;
}