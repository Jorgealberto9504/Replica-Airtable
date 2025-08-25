// apps/backend/src/controllers/auth.controller.ts
import type { Request, Response } from 'express';

// --- servicios/DB/utilidades ---
import { prisma } from '../services/db.js';
import {
  createUserAdmin,
  findUserByEmail,
  isUniqueEmailError,
} from '../services/users.service.js';
import { checkPassword } from '../services/security/password.service.js';
import { signJwt } from '../services/security/jwt.service.js';
import { getAuthUser } from '../middlewares/auth.middleware.js';

// === Config de cookies/JWT ===
const COOKIE_NAME = process.env.COOKIE_NAME ?? 'session';

// === Helpers locales de validación de email (como ya los traías) ===
function isEmailBasic(email: string): boolean {
  // Regex básico: valida forma general del correo
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedDomain(email: string): boolean {
  // Si configuras ALLOWED_EMAIL_DOMAIN=mbqinc.com sólo acepta ese dominio
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN;
  if (!allowed) return true; // si no está definido, no filtramos por dominio
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === allowed.toLowerCase();
}

// === Reglas de contraseña fuerte (las que acordamos con Sofía) ===
import { isStrongPassword, STRONG_PWD_HELP } from '../services/security/password.rules.js';

/* ------------------------------------------------------------------------------------------------
 *  LOGIN / LOGOUT / ME
 *  - login: verifica credenciales, firma JWT y lo guarda en cookie HttpOnly
 *  - logout: borra cookie
 *  - me: devuelve el usuario autenticado (usa middleware requireAuth)
 * ----------------------------------------------------------------------------------------------*/

/** Helper: trae datos mínimos para login (incluye hash) */
async function getUserForLogin(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();   // ← normaliza
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      platformRole: true,
      isActive: true,
      mustChangePassword: true,
      canCreateBases: true, // ← lo exponemos también en login (útil en frontend)
    },
  });
}

/**
 * POST /auth/login
 * Body: { email, password }
 * - Verifica credenciales
 * - Firma JWT y lo guarda en cookie HttpOnly
 * - Devuelve datos públicos del usuario
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  // 1) Requeridos
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'email y password son requeridos' });
  }

  // 2) Usuario existe
  const user = await getUserForLogin(email);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }

  // 3) Activo
  if (!user.isActive) {
    return res.status(403).json({ ok: false, error: 'Cuenta desactivada' });
  }

  // 4) Password correcta
  const okPass = await checkPassword(password, user.passwordHash);
  if (!okPass) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }

  // 5) Firmar JWT (sub = id del user)
  const token = signJwt({
    sub: String(user.id),
    email: user.email,
    role: user.platformRole,
  });

  // 6) Guardar JWT en cookie HttpOnly
  const inProd = process.env.NODE_ENV === 'production';
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: inProd,
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/', // importante para que clearCookie funcione en logout
  });

  // 7) Devolver user público
  return res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      mustChangePassword: user.mustChangePassword,
      canCreateBases: user.canCreateBases, // ← ahora viene también aquí
    },
  });
}

/**
 * POST /auth/logout
 * - Borra la cookie del JWT
 */
export async function logout(_req: Request, res: Response) {
  const inProd = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: inProd,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ ok: true });
}

/**
 * GET /auth/me
 * - Requiere requireAuth
 * - Devuelve el usuario pegado por el middleware
 */
export async function me(req: Request, res: Response) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }
  return res.json({ ok: true, user });
}

/* ------------------------------------------------------------------------------------------------
 *  REGISTRO ADMIN (como ya lo tenías, ahora con canCreateBases opcional)
 *  Sólo SYSADMIN: crea usuario con password temporal y obliga a cambiarla
 * ----------------------------------------------------------------------------------------------*/

/**
 * POST /auth/admin/register
 * Sólo SYSADMIN: crea usuario con password temporal y obliga a cambiarla en primer login.
 * body: { email, fullName, tempPassword, platformRole?, canCreateBases? }
 */
export async function adminRegister(req: Request, res: Response) {
  try {
    const { email, fullName, tempPassword, platformRole, canCreateBases } = req.body as {
      email?: string;
      fullName?: string;
      tempPassword?: string;
      platformRole?: 'USER' | 'SYSADMIN';
      canCreateBases?: boolean; // ← NUEVO
    };

    // Requeridos
    if (!email || !fullName || !tempPassword) {
      return res.status(400).json({ ok: false, error: 'email, fullName y tempPassword son requeridos' });
    }

    // Email válido + dominio permitido
    if (!isEmailBasic(email)) {
      return res.status(400).json({ ok: false, error: 'Email inválido' });
    }
    if (!isAllowedDomain(email)) {
      return res.status(403).json({ ok: false, error: 'Dominio de email no permitido' });
    }

    // Fuerza de contraseña temporal
    if (!isStrongPassword(tempPassword)) {
      return res.status(400).json({ ok: false, error: STRONG_PWD_HELP });
    }

    // Duplicado
    const exists = await findUserByEmail(email);
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Email ya registrado' });
    }

    // Crear usuario (mustChangePassword=true internamente en createUserAdmin)
    const user = await createUserAdmin({
      email,
      fullName,
      password: tempPassword,
      platformRole: platformRole ?? 'USER',
      canCreateBases: !!canCreateBases, // ← pasa el flag al service
    });

    return res.status(201).json({ ok: true, user });
  } catch (e) {
    if (isUniqueEmailError(e)) {
      return res.status(409).json({ ok: false, error: 'Email ya registrado' });
    }
    console.error('[adminRegister] error:', e);
    return res.status(500).json({ ok: false, error: 'Error al registrar usuario' });
  }
}