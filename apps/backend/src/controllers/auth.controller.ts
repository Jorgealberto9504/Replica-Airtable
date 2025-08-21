// apps/backend/src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { createUserAdmin, findUserByEmail, isUniqueEmailError } from '../services/users.service.js';
import { isStrongPassword, STRONG_PWD_HELP } from '../services/security/password.rules.js';

// (reutiliza tus helpers de email si ya los tienes definidos en este archivo)
function isEmailBasic(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isAllowedDomain(email: string): boolean {
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN;
  if (!allowed) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === allowed.toLowerCase();
}

/**
 * POST /auth/admin/register
 * Sólo SYSADMIN: crea usuario con password temporal y obliga a cambiarla en primer login.
 * body: { email, fullName, tempPassword, platformRole? }
 */
export async function adminRegister(req: Request, res: Response) {
  try {
    const { email, fullName, tempPassword, platformRole } = req.body as {
      email?: string;
      fullName?: string;
      tempPassword?: string;
      platformRole?: 'USER' | 'SYSADMIN';
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

    // Crear usuario (mustChangePassword=true)
    const user = await createUserAdmin({
      email,
      fullName,
      password: tempPassword,
      platformRole: platformRole ?? 'USER',
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







/* Pruebas

falta de campos

{
"email":"Jorge@gmail.com",
"fullName":"",
"password":"1231456"
}

{"ok":false,"error":"email, fullName y password son requeridos"}




email invalido

{
"email":"Jorgembqinc.com",
"fullName":"Jorge Escalante",
"password":"1231456"
}

{"ok":false,"error":"Email inválido"}



Dominio no permitido

{
"email":"Jorge@gmail.com",
"fullName":"Jorge Escalante",
"password":"1231456"
}


Caso de éxito
{
"email":"Jorge@mbqinc.com",
"fullName":"Jorge Escalante",
"password":"1231456"
}
{ "ok": true, "user": { "id": 1, "email": "pepe@mbqinc.com", "fullName": "Pepe Pérez", "createdAt": "...", "platformRole": "USER" } }.  sin passwordHJash



// Duplicado (con el mismo email)

{
"email":"Jorge@mbqinc.com",
"fullName":"Jorge Escalante",
"password":"1231456"
}

{"ok":false,"error":"Email ya registrado"}
*/