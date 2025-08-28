// apps/backend/src/routes/auth.routes.ts
import { Router } from 'express';
import {login,logout,me,adminRegister} from '../controllers/auth.controller.js';
import { requireAuth, requireSuperadmin, requireAuthAllowMustChange } from '../middlewares/auth.middleware.js';
import { changePasswordFirstLogin } from '../controllers/auth.controller.js';

const router = Router();

// --- Auth básicas ---
router.post('/login', login);                // firma JWT y setea cookie
router.post('/logout', requireAuth, logout); // borra cookie
router.get('/me', requireAuth, me);          // devuelve usuario autenticado

// --- Registro sólo por SYSADMIN ---
router.post('/admin/register', requireAuth, requireSuperadmin, adminRegister);

// --- Cambio de contraseña (primer login) ---
router.post('/change-password', requireAuthAllowMustChange, changePasswordFirstLogin);


export default router;