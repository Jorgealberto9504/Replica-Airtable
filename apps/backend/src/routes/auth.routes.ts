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

//POST /auth/login  { email, password }
//LOGUEAR USUARIO
router.post('/login', login);  

//POST /auth/logout  (borra cookie)
//LOGOUT USUARIO
router.post('/logout', requireAuth, logout); 

//GET /auth/me
//DEVUELVE DATOS DE USUARIO AUTENTICADO
router.get('/me', requireAuth, me);          

//POST /auth/admin/register  { email, password }
//REGISTRAR NUEVO USUARIO (sólo sysadmin)
router.post('/admin/register', requireAuth, guardGlobal('platform:users:manage'), adminRegister);    // SOLO SYSADMIN por rules.ts


// POST /auth/change-password  {newPassword, confirm }
// Permite cambiar la contraseña en el primer login cuando mustChangePassword=true
router.post('/change-password', requireAuthAllowMustChange, changePasswordFirstLogin);

export default router;