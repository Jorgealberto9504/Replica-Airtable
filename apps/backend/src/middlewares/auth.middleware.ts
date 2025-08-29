// apps/backend/src/middlewares/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db.js';
import { verifyJwt } from '../services/security/jwt.service.js';

// Nombre de la cookie donde guardamos el JWT (viene de .env)
const COOKIE_NAME = process.env.COOKIE_NAME ?? 'session';

// 1) Verifica que el usuario esté autenticado (JWT válido en la cookie)
// apps/backend/src/middlewares/auth.middleware.ts

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // a) Leer la cookie
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ ok: false, error: 'No autenticado (sin cookie)' });
      return;
    }

    // b) Validar y decodificar el JWT
    const payload = verifyJwt<{ sub: string }>(token); // sub = id del usuario en string
    const userId = Number(payload.sub);
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Token inválido' });
      return;
    }

    // c) Cargar el usuario desde la base (y revisar que exista y esté activo)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        platformRole: true,       // 'USER' | 'SYSADMIN'
        isActive: true,           // para desactivar cuentas
        mustChangePassword: true, // para “cambiar contraseña”
        canCreateBases: true,     // permiso global de creador de bases
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ ok: false, error: 'No autorizado' });
      return;
    }

    // d) BLOQUEO si debe cambiar contraseña
    if (user.mustChangePassword) {
      // Tip: "reason" ayuda al frontend a redirigir a /change-password
      res.status(403).json({
        ok: false,
        error: 'Debes cambiar tu contraseña primero',
        reason: 'MUST_CHANGE_PASSWORD',
      });
      return;
    }

    // e) Pegar el usuario a la request y avanzar
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token inválido' });
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

// Permite el paso aunque mustChangePassword === true
// Úsalo en rutas como /auth/change-password y /auth/logout
export async function requireAuthAllowMustChange(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // a) Leer cookie con el JWT
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ ok: false, error: 'No autenticado (sin cookie)' });
      return;
    }

    // b) Validar/decodificar
    const payload = verifyJwt<{ sub: string }>(token);
    const userId = Number(payload.sub);
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Token inválido' });
      return;
    }

    // c) Cargar usuario (NO bloquea por mustChangePassword)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        platformRole: true,
        isActive: true,
        mustChangePassword: true,
        canCreateBases: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ ok: false, error: 'No autorizado' });
      return;
    }

    // d) Pegar usuario y continuar
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}