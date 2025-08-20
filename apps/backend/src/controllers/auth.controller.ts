// apps/backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { createUser, findUserByEmail, isUniqueEmailError } from '../services/users.service.js';

// --- utilidades simples de validación ---
function isEmailBasic(email: string): boolean {
  // Regex básico: suficiente para validar forma general
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedDomain(email: string): boolean {
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN; // ej: "mbq.com"
  if (!allowed) return true; // si no está configurado, no limitamos por dominio
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === allowed.toLowerCase();
}

/**
 * POST /auth/register
 * Crea un usuario nuevo (hasheando password).
 * Validaciones: campos requeridos, forma de email, dominio permitido, duplicado.
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, fullName, password } = req.body as {
      email?: string;
      fullName?: string;
      password?: string;
    };

    // 1) Requeridos
    if (!email || !fullName || !password) {
      return res.status(400).json({ ok: false, error: 'email, fullName y password son requeridos' });
    }

    // 2) Forma de email
    if (!isEmailBasic(email)) {
      return res.status(400).json({ ok: false, error: 'Email inválido' });
    }

    // 3) Dominio permitido
    if (!isAllowedDomain(email)) {
      return res.status(403).json({ ok: false, error: 'Dominio de email no permitido' });
    }

    // 4) Chequeo previo de duplicado (opcional, además de manejar P2002 abajo)
    const exists = await findUserByEmail(email);
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Email ya registrado' });
    }

    // 5) Crear usuario (hashea password internamente)
    const user = await createUser({ email, fullName, password });

    return res.status(201).json({ ok: true, user });
  } catch (e) {
    if (isUniqueEmailError(e)) {
      return res.status(409).json({ ok: false, error: 'Email ya registrado' });
    }
    console.error('[register] error:', e);
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