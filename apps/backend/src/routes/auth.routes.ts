// apps/backend/src/routes/auth.routes.ts
import { Router } from 'express';
import {
  login,
  logout,
  me,
  adminRegister,
  changePasswordFirstLogin,
} from '../controllers/auth.controller.js';

import { requireAuth, requireAuthAllowMustChange, } from '../middlewares/auth.middleware.js';

import { guardGlobal } from '../permissions/guard.js';

const router = Router();

// --- Auth básicas ---
router.post('/login', login);                 // firma JWT y setea cookie
router.post('/logout', requireAuth, logout);  // borra cookie
router.get('/me', requireAuth, me);           // devuelve usuario autenticado

// --- Registro sólo por SYSADMIN (según matriz de permisos) ---
router.post('/admin/register', requireAuth, guardGlobal('platform:users:manage'), adminRegister);    // SOLO SYSADMIN por rules.ts


// --- Cambio de contraseña (primer login) ---
router.post('/change-password', requireAuthAllowMustChange, changePasswordFirstLogin);

export default router;