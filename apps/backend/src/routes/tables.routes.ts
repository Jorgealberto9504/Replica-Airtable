import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guard, guardGlobal } from '../permissions/guard.js'; // <-- NUEVO: guardGlobal para rutas ADMIN
import {
  createTableCtrl,
  listTablesCtrl,
  getTableCtrl,
  updateTableCtrl,
  deleteTableCtrl,
  // ===== PAPELERA =====
  listTrashedTablesCtrl,
  restoreTableCtrl,
  deleteTablePermanentCtrl,
  emptyTableTrashCtrl,
  // ===== PAPELERA (ADMIN) =====
  listTrashedTablesAdminCtrl,
  listAllTrashedTablesAdminCtrl,      // <-- NUEVO: GLOBAL
  restoreTableAdminCtrl,
  deleteTablePermanentAdminCtrl,
} from '../controllers/tables.controller.js';

const router = Router();

// ===========================
// PAPELERA DE TABLAS (ADMIN)  
// ===========================

// GET /bases/admin/tables/trash
// LISTAR PAPELERA GLOBAL DE TABLAS (SOLO SYSADMIN)  <-- NUEVO
router.get(
  '/admin/tables/trash',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listAllTrashedTablesAdminCtrl
);

// GET /bases/admin/:baseId/tables/trash
// LISTAR TABLAS EN PAPELERA DE UNA BASE (SOLO SYSADMIN)
router.get(
  '/admin/:baseId/tables/trash',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listTrashedTablesAdminCtrl
);

// POST /bases/admin/:baseId/tables/:tableId/restore
// RESTAURAR UNA TABLA DESDE LA PAPELERA (SOLO SYSADMIN)
router.post(
  '/admin/:baseId/tables/:tableId/restore',
  requireAuth,
  guardGlobal('platform:users:manage'),
  restoreTableAdminCtrl
);

// DELETE /bases/admin/:baseId/tables/:tableId/permanent
// ELIMINAR DEFINITIVAMENTE UNA TABLA (SOLO SYSADMIN)
router.delete(
  '/admin/:baseId/tables/:tableId/permanent',
  requireAuth,
  guardGlobal('platform:users:manage'),
  deleteTablePermanentAdminCtrl
);

// ===========================
// PAPELERA DE TABLAS (OWNER)
// ===========================

// GET /bases/:baseId/tables/trash
// LISTAR TABLAS EN PAPELERA DE UNA BASE (SOLO OWNER)
router.get('/:baseId/tables/trash', requireAuth, guard('schema:manage'), listTrashedTablesCtrl);

// POST /bases/:baseId/tables/:tableId/restore
// RESTAURAR UNA TABLA DESDE LA PAPELERA (SOLO OWNER)
router.post('/:baseId/tables/:tableId/restore', requireAuth, guard('schema:manage'), restoreTableCtrl);

// DELETE /bases/:baseId/tables/:tableId/permanent
// ELIMINAR DEFINITIVAMENTE UNA TABLA (SOLO OWNER)
router.delete('/:baseId/tables/:tableId/permanent', requireAuth, guard('schema:manage'), deleteTablePermanentCtrl);

// POST /bases/:baseId/tables/trash/empty
// VACIAR LA PAPELERA DE TABLAS DE UNA BASE (SOLO OWNER)
router.post('/:baseId/tables/trash/empty', requireAuth, guard('schema:manage'), emptyTableTrashCtrl);

/* ===========================
   CRUD TABLAS (activas)
   =========================== */

// POST /bases/:baseId/tables  { name }
// CREAR UNA TABLA EN UNA BASE
router.post('/:baseId/tables', requireAuth, guard('schema:manage'), createTableCtrl);

// GET /bases/:baseId/tables
// LISTAR TABLAS DE UNA BASE
router.get('/:baseId/tables', requireAuth, guard('base:view'), listTablesCtrl);

// GET /bases/:baseId/tables/:tableId
// VER UNA TABLA POR ID
router.get('/:baseId/tables/:tableId', requireAuth, guard('base:view'), getTableCtrl);

// PATCH /bases/:baseId/tables/:tableId  { name }
// ACTUALIZAR UNA TABLA
router.patch('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), updateTableCtrl);

// DELETE /bases/:baseId/tables/:tableId
// ELIMINAR UNA TABLA (SOFT DELETE → PAPELERA)
router.delete('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), deleteTableCtrl);

export default router;