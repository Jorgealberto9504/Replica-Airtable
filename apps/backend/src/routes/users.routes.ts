import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guardGlobal } from '../permissions/guard.js';
import {
  // NUEVO ADMIN
  listUsersAdminCtrl,
  getUserAdminCtrl,
  updateUserAdminCtrl,
  resetUserPasswordAdminCtrl,
  // COMPAT (DEPRECATED)
  listUsersCtrl,
  setCanCreateBasesCtrl,
} from '../controllers/users.controller.js';

const router = Router();

/* ===========================
   ADMIN: Gestión de usuarios
   =========================== */

// GET /users/admin?page=1&limit=10
// LISTAR USUARIOS (SYSADMIN) con filtros/paginación
router.get(
  '/admin',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listUsersAdminCtrl
);

// GET /users/admin/:id
// VER DETALLE DE USUARIO (SYSADMIN)
router.get(
  '/admin/:id',
  requireAuth,
  guardGlobal('platform:users:manage'),
  getUserAdminCtrl
);

// PATCH /users/admin/:id  { fullName?, platformRole?, isActive?, canCreateBases?, mustChangePassword? }
// ACTUALIZAR DATOS/PERMISOS DE USUARIO (SYSADMIN)
router.patch(
  '/admin/:id',
  requireAuth,
  guardGlobal('platform:users:manage'),
  updateUserAdminCtrl
);

// POST /users/admin/:id/reset-password  { newPassword }
// RESET DE CONTRASEÑA (SYSADMIN) — fuerza mustChangePassword=true
router.post(
  '/admin/:id/reset-password',
  requireAuth,
  guardGlobal('platform:users:manage'),
  resetUserPasswordAdminCtrl
);

export default router;