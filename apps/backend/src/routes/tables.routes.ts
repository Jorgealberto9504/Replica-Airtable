import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guard, guardGlobal } from '../permissions/guard.js';
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
  listAllTrashedTablesAdminCtrl,
  restoreTableAdminCtrl,
  deleteTablePermanentAdminCtrl,
  // ===== NAV / REORDER =====
  listTablesNavCtrl,
  reorderTablesCtrl,
  // ===== META GRID =====
  getTableMetaCtrl,
} from '../controllers/tables.controller.js';

const router = Router();

// ===========================
// PAPELERA DE TABLAS (ADMIN)  
// ===========================
router.get(
  '/admin/tables/trash',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listAllTrashedTablesAdminCtrl
);
router.get(
  '/admin/:baseId/tables/trash',
  requireAuth,
  guardGlobal('platform:users:manage'),
  listTrashedTablesAdminCtrl
);
router.post(
  '/admin/:baseId/tables/:tableId/restore',
  requireAuth,
  guardGlobal('platform:users:manage'),
  restoreTableAdminCtrl
);
router.delete(
  '/admin/:baseId/tables/:tableId/permanent',
  requireAuth,
  guardGlobal('platform:users:manage'),
  deleteTablePermanentAdminCtrl
);

// ===========================
// PAPELERA DE TABLAS (OWNER)
// ===========================
router.get('/:baseId/tables/trash', requireAuth, guard('schema:manage'), listTrashedTablesCtrl);
router.post('/:baseId/tables/:tableId/restore', requireAuth, guard('schema:manage'), restoreTableCtrl);
router.delete('/:baseId/tables/:tableId/permanent', requireAuth, guard('schema:manage'), deleteTablePermanentCtrl);
router.post('/:baseId/tables/trash/empty', requireAuth, guard('schema:manage'), emptyTableTrashCtrl);

/* ===========================
   CRUD TABLAS (activas)
   =========================== */
router.post('/:baseId/tables', requireAuth, guard('schema:manage'), createTableCtrl);
router.get('/:baseId/tables', requireAuth, guard('base:view'), listTablesCtrl);

// NAV + REORDER
router.get('/:baseId/tables/nav', requireAuth, guard('base:view'), listTablesNavCtrl);
router.patch('/:baseId/tables/reorder', requireAuth, guard('schema:manage'), reorderTablesCtrl);

// META (estructura de columnas del grid)
router.get('/:baseId/tables/:tableId/meta', requireAuth, guard('base:view'), getTableMetaCtrl);

// CRUD single
router.get('/:baseId/tables/:tableId', requireAuth, guard('base:view'), getTableCtrl);
router.patch('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), updateTableCtrl);
router.delete('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), deleteTableCtrl);

export default router;