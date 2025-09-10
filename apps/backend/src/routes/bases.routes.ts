// apps/backend/src/routes/bases.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guard, guardGlobal } from '../permissions/guard.js';
import {
  // CRUD por base (activas)
  listMyBasesCtrl,
  getBaseCtrl,
  updateBaseCtrl,
  deleteBaseCtrl,
  // mover base entre workspaces
  moveBaseToWorkspaceCtrl,
  // PAPELERA (owner)
  listMyTrashedBasesCtrl,
  restoreBaseCtrl,
  deleteBasePermanentCtrl,
  emptyMyTrashCtrl,
  // ADMIN (papelera global + purge)
  purgeTrashCtrl,
  listAllTrashedBasesCtrl,
  restoreBaseAdminCtrl,
  deleteBasePermanentAdminCtrl,
} from '../controllers/bases.controller.js';

const router = Router();

/* ===========================
   ADMIN (papelera global)
   =========================== */

// GET /bases/admin/trash
// LISTAR PAPELERA GLOBAL DE BASES (SOLO SYSADMIN)
router.get(
  '/admin/trash',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listAllTrashedBasesCtrl
);

// POST /bases/admin/trash/purge?days=30
// PURGA GLOBAL: BORRA TODO LO EN PAPELERA CON ANTIGÜEDAD >= DAYS (SOLO SYSADMIN)
router.post(
  '/admin/trash/purge',
  requireAuth,
  guardGlobal('platform:users:manage'),
  purgeTrashCtrl
);

// POST /bases/admin/:baseId/restore
// RESTAURAR BASE DESDE PAPELERA (SOLO SYSADMIN)
router.post(
  '/admin/:baseId/restore',
  requireAuth,
  guardGlobal('platform:users:manage'),
  restoreBaseAdminCtrl
);

// DELETE /bases/admin/:baseId/permanent
// ELIMINAR DEFINITIVAMENTE UNA BASE (SOLO SYSADMIN)
router.delete(
  '/admin/:baseId/permanent',
  requireAuth,
  guardGlobal('platform:users:manage'),
  deleteBasePermanentAdminCtrl
);

/* ===========================
   PAPELERA DE BASES (owner)
   =========================== */

// GET /bases/trash
// LISTAR MI PAPELERA DE BASES (SOLO AUTENTICADO)
router.get('/trash', requireAuth, listMyTrashedBasesCtrl);

// POST /bases/trash/empty
// VACIAR MI PAPELERA (BORRADO DEFINITIVO DE TODAS MIS BASES EN PAPELERA)
router.post('/trash/empty', requireAuth, emptyMyTrashCtrl);

// POST /bases/:baseId/restore
// RESTAURAR BASE DESDE PAPELERA (SOLO OWNER / SYSADMIN pasa guard)
router.post('/:baseId/restore', requireAuth, guard('schema:manage'), restoreBaseCtrl);

// DELETE /bases/:baseId/permanent
// BORRADO DEFINITIVO DE BASE (SOLO OWNER / SYSADMIN pasa guard)
router.delete('/:baseId/permanent', requireAuth, guard('base:delete'), deleteBasePermanentCtrl);

/* ===========================
   CRUD BASES (activas)
   =========================== */

// GET /bases
// LISTAR MIS BASES (EXCLUYE PAPELERA)
router.get('/', requireAuth, listMyBasesCtrl);

// GET /bases/:baseId
// VER UNA BASE POR ID (EXCLUYE PAPELERA)
router.get('/:baseId', requireAuth, guard('base:view'), getBaseCtrl);

// PATCH /bases/:baseId  { name, visibility }
// ACTUALIZAR BASE (SOLO OWNER / SYSADMIN)
router.patch('/:baseId', requireAuth, guard('schema:manage'), updateBaseCtrl);

// PATCH /bases/:baseId/move-to-workspace  { newWorkspaceId }
// MOVER UNA BASE A OTRO WORKSPACE (MISMO OWNER)
router.patch('/:baseId/move-to-workspace', requireAuth, guard('schema:manage'), moveBaseToWorkspaceCtrl);

// DELETE /bases/:baseId
// ELIMINAR BASE (SOFT DELETE → PAPELERA)
router.delete('/:baseId', requireAuth, guard('base:delete'), deleteBaseCtrl);

export default router;