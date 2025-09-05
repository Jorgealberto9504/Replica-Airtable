// apps/backend/src/routes/tables.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guard } from '../permissions/guard.js';
import {
  createTableCtrl,
  listTablesCtrl,
  getTableCtrl,
  updateTableCtrl,
  deleteTableCtrl,
} from '../controllers/tables.controller.js';

const router = Router();

// POST /bases/:baseId/tables  { name }
//CREAR UNA TABLA EN UNA BASE
router.post('/:baseId/tables', requireAuth, guard('schema:manage'), createTableCtrl);

// GET /bases/:baseId/tables
//LISTAR TABLAS DE UNA BASE
router.get('/:baseId/tables', requireAuth, guard('base:view'), listTablesCtrl);

// GET /bases/:baseId/tables/:tableId
//VER UNA TABLA POR ID
router.get('/:baseId/tables/:tableId', requireAuth, guard('base:view'), getTableCtrl);

// PATCH /bases/:baseId/tables/:tableId  { name }
//ACTUALIZAR UNA TABLA
router.patch('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), updateTableCtrl);

// DELETE /bases/:baseId/tables/:tableId
//ELIMINAR UNA TABLA
router.delete('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), deleteTableCtrl);

export default router;