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

/**
 * Crear tabla en una base
 * POST /bases/:baseId/tables
 * Requiere: autenticado + permiso 'schema:manage' en ESA base
 */
router.post('/:baseId/tables', requireAuth, guard('schema:manage'), createTableCtrl);

/**
 * Listar tablas de una base
 * GET /bases/:baseId/tables
 * Requiere: autenticado + permiso 'base:view' en ESA base
 */
router.get('/:baseId/tables', requireAuth, guard('base:view'), listTablesCtrl);

/**
 * Obtener una tabla específica de una base
 * GET /bases/:baseId/tables/:tableId
 * Requiere: autenticado + permiso 'base:view' en ESA base
 */
router.get('/:baseId/tables/:tableId', requireAuth, guard('base:view'), getTableCtrl);

/**
 * Renombrar/actualizar una tabla
 * PATCH /bases/:baseId/tables/:tableId
 * Requiere: autenticado + permiso 'schema:manage' en ESA base
 */
router.patch('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), updateTableCtrl);

/**
 * Eliminar una tabla
 * DELETE /bases/:baseId/tables/:tableId
 * Requiere: autenticado + permiso 'schema:manage' en ESA base
 */
router.delete('/:baseId/tables/:tableId', requireAuth, guard('schema:manage'), deleteTableCtrl);

export default router;