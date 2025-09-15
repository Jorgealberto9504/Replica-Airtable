// apps/backend/src/routes/workspaces.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guardGlobal } from '../permissions/guard.js';
import {
  // CRUD (activos)
  createWorkspaceCtrl,
  listMyWorkspacesCtrl,
  listAllWorkspacesSysadminCtrl,
  getWorkspaceCtrl,
  updateWorkspaceCtrl,
  deleteWorkspaceCtrl,
  // PAPELERA (owner)
  listMyTrashedWorkspacesCtrl,
  restoreWorkspaceCtrl,
  deleteWorkspacePermanentCtrl,
  emptyMyWorkspaceTrashCtrl,
  // PAPELERA GLOBAL (admin)
  listAllTrashedWorkspacesCtrl,
  purgeWorkspacesTrashCtrl,
} from '../controllers/workspaces.controller.js';

// === BASES dentro de WORKSPACES (nuevo) ===
import {
  createBaseInWorkspaceCtrl,
  listBasesForWorkspaceCtrl,
} from '../controllers/bases.controller.js';

const router = Router();

/* ===========================
   PAPELERA DE WORKSPACES
   =========================== */

// GET /workspaces/trash
// LISTAR MI PAPELERA DE WORKSPACES (SOLO AUTENTICADO)
router.get('/trash', requireAuth, listMyTrashedWorkspacesCtrl);

// POST /workspaces/trash/empty
// VACIAR MI PAPELERA (BORRADO DEFINITIVO DE TODOS MIS WORKSPACES EN PAPELERA)
router.post('/trash/empty', requireAuth, emptyMyWorkspaceTrashCtrl);

// GET /workspaces/admin/trash
// LISTAR PAPELERA GLOBAL DE WORKSPACES (SOLO SYSADMIN)
router.get(
  '/admin/trash',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listAllTrashedWorkspacesCtrl
);

// POST /workspaces/admin/trash/purge?days=30
// PURGA GLOBAL: BORRA WORKSPACES EN PAPELERA CON ANTIGÜEDAD >= DAYS (SOLO SYSADMIN)
router.post(
  '/admin/trash/purge',
  requireAuth,
  guardGlobal('platform:users:manage'),
  purgeWorkspacesTrashCtrl
);

/* ===========================================
   BASES DENTRO DE UN WORKSPACE (rutas hijas)
   =========================================== */

// POST /workspaces/:workspaceId/bases  { name, visibility }
// CREAR BASE DENTRO DE UN WORKSPACE
router.post(
  '/:workspaceId/bases',
  requireAuth,
  guardGlobal('bases:create'),
  createBaseInWorkspaceCtrl
);

// GET /workspaces/:workspaceId/bases
// LISTAR BASES ACTIVAS DE UN WORKSPACE
router.get(
  '/:workspaceId/bases',
  requireAuth,
  listBasesForWorkspaceCtrl
);

/* ===========================
   CRUD WORKSPACES (activos)
   =========================== */

// POST /workspaces  { name }
// CREAR WORKSPACE (OWNER = USUARIO AUTENTICADO)
router.post('/', requireAuth, guardGlobal('bases:create'), createWorkspaceCtrl);

// GET /workspaces
// LISTAR MIS WORKSPACES (EXCLUYE PAPELERA)
router.get('/', requireAuth, listMyWorkspacesCtrl);

// GET /workspaces/admin
// LISTAR TODOS LOS WORKSPACES ACTIVOS (SOLO SYSADMIN)
router.get(
  '/admin',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listAllWorkspacesSysadminCtrl
);

// GET /workspaces/:workspaceId
// VER UN WORKSPACE POR ID (EXCLUYE PAPELERA)
router.get('/:workspaceId', requireAuth, getWorkspaceCtrl);

// PATCH /workspaces/:workspaceId  { name }
// ACTUALIZAR WORKSPACE (SOLO OWNER / SYSADMIN: VALIDADO EN SERVICE)
router.patch('/:workspaceId', requireAuth, updateWorkspaceCtrl);

// DELETE /workspaces/:workspaceId
// ELIMINAR WORKSPACE (SOFT DELETE → PAPELERA, CON CASCADA A BASES/TABLAS)
router.delete('/:workspaceId', requireAuth, deleteWorkspaceCtrl);

// POST /workspaces/:workspaceId/restore
// RESTAURAR WORKSPACE DESDE PAPELERA (OWNER O SYSADMIN)
router.post('/:workspaceId/restore', requireAuth, restoreWorkspaceCtrl);

// DELETE /workspaces/:workspaceId/permanent
// BORRADO DEFINITIVO DE WORKSPACE (OWNER O SYSADMIN)
router.delete('/:workspaceId/permanent', requireAuth, deleteWorkspacePermanentCtrl);

export default router;