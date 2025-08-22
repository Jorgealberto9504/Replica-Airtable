// apps/backend/src/routes/auth.routes.ts
import { Router } from 'express';
import {login,logout,me,adminRegister} from '../controllers/auth.controller.js';
import { requireAuth, requireSuperadmin } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Auth básicas ---
router.post('/login', login);                // firma JWT y setea cookie
router.post('/logout', requireAuth, logout); // borra cookie
router.get('/me', requireAuth, me);          // devuelve usuario autenticado

// --- Registro sólo por SYSADMIN ---
router.post('/admin/register', requireAuth, requireSuperadmin, adminRegister);


export default router;