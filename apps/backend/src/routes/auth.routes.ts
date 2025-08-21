import { Router } from 'express';
import { adminRegister } from '../controllers/auth.controller.js';
import { requireAuth, requireSysadmin } from '../middlewares/auth.middleware.js';

const router = Router();

/** Registro de usuarios por superusuario (SYSADMIN) */
router.post('/admin/register', requireAuth, requireSysadmin, adminRegister);

export default router;